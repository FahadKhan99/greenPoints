"use client";

import { useState, useCallback, useEffect } from "react";
import { MapPin, Upload, CheckCircle, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";

import { GoogleGenerativeAI } from "@google/generative-ai";

// google maps api for location suggestions
import {
  StandaloneSearchBox,
  useJsApiLoader,
  Libraries,
} from "@react-google-maps/api";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Reports, Users } from "@/utils/types";
import {
  createReport,
  getAllReports,
  getUserByEmail,
} from "@/utils/db/actions";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/helper";

const geminiApiKey = process.env.GEMINI_API_KEY;
const googleMapsApiKey = process.env.GOOGLE_MAP_API_KEY;

type VerificationStatus = "idle" | "verifying" | "success" | "failure";
type VerificationResult = {
  quantity: string;
  confidence: number;
  wasteType: string;
};
type NewReport = {
  wasteType: string;
  location: string;
  amount: string;
};

const ReportPage = () => {
  const router = useRouter();

  const [user, setUser] = useState<Users | null>(null);
  const [reports, setReports] = useState<Reports[]>([]);
  const [newReport, setNewReport] = useState<NewReport>({
    wasteType: "",
    location: "",
    amount: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // for image
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // for gemini
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>("idle");
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);

  // for google maps
  const [searchBox, setSearchBox] =
    useState<google.maps.places.SearchBox | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: googleMapsApiKey!,
    libraries: ["places"],
  });

  const onLoad = useCallback((ref: google.maps.places.SearchBox) => {
    setSearchBox(ref);
  }, []);

  const onPlaceChanged = () => {
    if (searchBox) {
      const places = searchBox.getPlaces();
      if (places) {
        const place = places[0];
        setNewReport((prev) => ({
          ...prev,
          location: place.formatted_address || "",
        }));
      }
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewReport({ ...newReport, [name]: value });
  };

  // if a file exists
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  // gemini aspects base64 image or file
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleVerify = async () => {
    if (!file) return;

    setVerificationStatus("verifying");

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey!);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const base64Data = await readFileAsBase64(file);

      const imageParts = [
        {
          inlineData: {
            data: base64Data.split(",")[1], // data:[<MIME-type>][;base64],<data>  just take <data>
            mimeType: file.type,
          },
        },
      ];

      const prompt = `You are an expert in waste management and recycling. Analyze this image and provide:
        1. The type of waste (e.g., plastic, paper, glass, metal, organic)
        2. An estimate of the quantity or amount (in kg or liters)
        3. Your confidence level in this assessment (as a percentage)
        
        Respond in JSON format like this:
        {
          "wasteType": "type of waste",
          "quantity": "estimated quantity with unit",
          "confidence": confidence level as a number between 0 and 1
        }`;

      const result = await model.generateContent([prompt, ...imageParts]); // could one or more images
      const response = await result.response;
      const text = response.text();
      const cleanText = text.replace(/```json\n|```/g, "");

      try {
        const parsedResult = JSON.parse(cleanText);

        if (
          parsedResult.wasteType &&
          parsedResult.quantity &&
          parsedResult.confidence
        ) {
          setVerificationResult(parsedResult);
          setVerificationStatus("success");
          setNewReport({
            ...newReport,
            wasteType: parsedResult.wasteType,
            amount: parsedResult.quantity,
          });
        } else {
          console.error("Invalid verification result:", parsedResult);
          setVerificationStatus("failure");
        }
      } catch (error) {
        console.error("Failed to parse JSON response:", text);
        setVerificationStatus("failure");
      }
    } catch (error) {
      console.error("Error verifying waste:", error);
      setVerificationStatus("failure");
    }
  };

  // when user clicks on sumbit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationStatus !== "success" || !user) {
      toast.error("Please verify the waste before submitting or log in.");
      return;
    }

    setIsSubmitting(true);
    try {
      const report = await createReport(
        user.id!,
        newReport.location,
        newReport.wasteType,
        newReport.amount,
        preview || undefined,
        verificationResult ? JSON.stringify(verificationResult) : undefined
      );

      if (!report) throw new Error("Failed to create report");

      const formattedReport = {
        id: report.id,
        userId: report.userId,
        location: report.location,
        wasteType: report.wasteType,
        amount: report.amount,
        status: report.status,

        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      };

      setReports([formattedReport, ...reports]);
      setNewReport({ location: "", wasteType: "", amount: "" });
      setFile(null);
      setPreview(null);
      setVerificationStatus("idle");
      setVerificationResult(null);

      toast.success(
        `Report submitted successfully! You've earned points for reporting waste.`
      );
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // check user authentication fetch the user info
  useEffect(() => {
    const checkUser = async () => {
      const email = localStorage.getItem("userEmail");

      if (email) {
        let user = await getUserByEmail(email);

        if (!user) throw new Error("User doesn't exists");

        setUser(user);

        const recentReports: Reports[] = await getAllReports();
        console.log(recentReports);

        setReports(recentReports);
      } else {
        toast.error("You must be logged in to access Report waste page.");
        router.push("/");
      }
    };

    checkUser();
  }, [router]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6 text-gray-800">
        Report Waste
      </h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-5 rounded-2xl shadow-lg mb-12"
      >
        <div className="mb-8">
          <label
            htmlFor="waste-image"
            className="block text-lg font-medium text-gray-700 mb-2"
          >
            Upload Waste Image
          </label>

          <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-green-500 transition-colors duration-300">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm items-center text-gray-600">
                <label
                  htmlFor="waste-image"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-green-500"
                >
                  <span className="text-base">Upload a file</span>
                  <input
                    id="waste-image"
                    name="waste-image"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    accept="image/*"
                  />
                </label>
                <p className="pl-1"> or drag and drop</p>
              </div>
              <p className="text-sm text-gray-500 ">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
        </div>

        {/* if there is a preview of image we show it here */}
        {preview && (
          <div className="mt-4 mb-8">
            <img
              src={preview}
              alt="Waste Preview"
              className="min-w-full h-full rounded-xl shadow-md"
            />
          </div>
        )}

        <Button
          type="button"
          onClick={handleVerify}
          className="w-full mb-8 bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg rounded-xl transition-colors duration-300"
          disabled={!file || verificationStatus === "verifying"}
        >
          {verificationStatus === "verifying" ? (
            <>
              <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Verifying...
            </>
          ) : (
            "Verify Waste"
          )}
        </Button>

        {/* for displaying the gemini result */}
        {verificationStatus === "success" && verificationResult && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-8 rounded-r-xl">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-400 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-green-800">
                  Verification Successful
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Waste Type: {verificationResult.wasteType}</p>
                  <p>Quantity: {verificationResult.quantity}</p>
                  <p>
                    Confidence:{" "}
                    {(verificationResult.confidence * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium ml-1 text-gray-700 mb-1"
            >
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={newReport.location}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300"
              placeholder="Enter waste location"
            />
            {/* {isLoaded ? (
              <StandaloneSearchBox
                onLoad={onLoad}
                onPlacesChanged={onPlaceChanged}
              >
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={newReport.location}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300"
                  placeholder="Enter waste location"
                />
              </StandaloneSearchBox>
            ) : (
              <input
                type="text"
                id="location"
                name="location"
                value={newReport.location}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300"
                placeholder="Enter waste location"
              />
            )} */}
          </div>
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium ml-1 text-gray-700 mb-1"
            >
              Waste Type
            </label>
            <input
              type="text"
              id="type"
              name="type"
              value={newReport.wasteType}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 bg-gray-100"
              placeholder="Verified waste type"
              readOnly
            />
          </div>
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium ml-1 text-gray-700 mb-1"
            >
              Estimated Amount
            </label>
            <input
              type="text"
              id="amount"
              name="amount"
              value={newReport.amount}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 bg-gray-100"
              placeholder="Verified amount"
              readOnly
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg rounded-xl transition-colors duration-300 flex items-center justify-center"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Submitting...
            </>
          ) : (
            "Submit Report"
          )}
        </Button>
      </form>

      <h2 className="text-3xl font-semibold mb-6 text-gray-800">
        Recent Reports
      </h2>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <Table>
            {/* <TableCaption>A list of your recent invoices.</TableCaption> */}
            <TableHeader>
              <TableRow className="bg-green-400 hover:bg-green-400">
                <TableHead className="border-r text-white px-6 py-3 text-left text-xs font-medium tracking-wider">
                  LOCATION
                </TableHead>
                <TableHead className="border-r text-white px-6 py-3 text-left text-xs font-medium tracking-wider">
                  TYPE
                </TableHead>
                <TableHead className="border-r text-white px-6 py-3 text-left text-xs font-medium tracking-wider">
                  AMOUNT
                </TableHead>
                <TableHead className="border-r text-white px-6 py-3 text-left text-xs font-medium tracking-wider">
                  DATE
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="border-r bg-gray-100 border-white px-6 whitespace-nowrap text-sm text-gray-600">
                    <MapPin className="inline-block w-4 h-4 mr-2 text-green-500" />
                    {report.location}
                  </TableCell>
                  <TableCell className="border-r bg-gray-100 border-white px-6 whitespace-nowrap text-sm text-gray-600">
                    {report.wasteType}
                  </TableCell>
                  <TableCell className="border-r bg-gray-100 border-white px-6 whitespace-nowrap text-sm text-gray-600">
                    {report.amount}
                  </TableCell>
                  <TableCell className="border-r bg-gray-100 border-white px-6 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(report.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
