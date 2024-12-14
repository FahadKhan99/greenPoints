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

const geminiApiKey = process.env.GEMINI_API_KEY;
const googleMapsApiKey = process.env.GOOGLE_MAP_API_KEY;

const libraries: Libraries = ["places"];

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

  // @ts-ignore
  const { isLoading } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: googleMapsApiKey!,
    libraries,
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

      try {
        const parsedResult = JSON.parse(text);

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

        setReports(recentReports);
      } else {
        router.push("/");
      }
    };
    
    checkUser();
  }, [router]);

  return <div></div>;
};

export default ReportPage;
