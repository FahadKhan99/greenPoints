"use client";

import { useState, useEffect } from "react";
import {
  Trash2,
  MapPin,
  CheckCircle,
  Clock,
  ArrowRight,
  Camera,
  Upload,
  Loader,
  Calendar,
  Weight,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Users } from "@/utils/types";
import {
  getUserByEmail,
  getWasteCollectionTask,
  updateTaskStatus,
} from "@/utils/db/actions";
import { useRouter } from "next/navigation";

const geminiApiKey = process.env.GEMINI_API_KEY;

type CollectionTask = {
  id: number;
  location: string;
  wasteType: string;
  amount: string;
  status: "pending" | "in_progress" | "completed" | "verified";
  date: string;
  collectorId: number | null;
};

const ITEMS_PER_PAGE = 5;

function CollectPage() {
  const router = useRouter();

  const [tasks, setTasks] = useState<CollectionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredWasteType, setHoveredWasteType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState<Users | null>(null);

  const [selectedTask, setSelectedTask] = useState<CollectionTask | null>(null);
  const [verificationImage, setVerificationImage] = useState<string | null>(
    null
  );
  const [verificationStatus, setVerificationStatus] = useState<
    "idle" | "verifying" | "success" | "failure"
  >("idle");
  const [verificationResult, setVerificationResult] = useState<{
    wasteTypeMatch: boolean;
    quantityMatch: boolean;
    confidence: number;
  } | null>(null);
  const [reward, setReward] = useState<number | null>(null);

  //fetch user and the tasks
  useEffect(() => {
    const fetchUserAndTask = async () => {
      setLoading(true);
      try {
        const userEmail = localStorage.getItem("userEmail");

        if (userEmail) {
          const user = await getUserByEmail(userEmail);

          if (user) {
            setUser(user);
          }
        } else {
          toast.error("You must be logged in to access this page.");
          router.push("/");
        }

        // fetch the task (user reported waste)
        const fetchedTask = await getWasteCollectionTask();
        setTasks(fetchedTask);
      } catch (error) {
        console.error("Error fetching user and task", error);
        toast.error("Failed to load collection tasks. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndTask();
  }, []);

  const handleStatusChange = async (
    taskId: number,
    newStatus: CollectionTask["status"]
  ) => {
    if (!user) return;
    try {
      const updatedTask = await updateTaskStatus(taskId, newStatus, user?.id);

      if (updatedTask) {
        // update the frontend
        setTasks(
          tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status: updatedTask.status as CollectionTask["status"],
                  collectorId: user.id,
                }
              : task
          )
        );

        toast.success("Task status updated successfully");
      } else {
        toast.error("Failed to update task status. Please try again.");
      }
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task status. Please try again.");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVerificationImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const readFileAsBase64 = (dataUrl: string): string => {
    return dataUrl.split(",")[1];
  };

  // verify the image and confirm the waste collect
  const handleVerify = async () => {
    if (!selectedTask || !verificationImage || !user) {
      toast.error("Missing required information for verification.");
      return;
    }

    setVerificationStatus("verifying");

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey!);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const base64Data = readFileAsBase64(verificationImage);

      const imageParts = [
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/*", // for all images
          },
        },
      ];

      const prompt = `You are an expert in waste management and recycling. Analyze this image and provide:
        1. Confirm if the waste type matches: ${selectedTask.wasteType}
        2. Estimate if the quantity matches: ${selectedTask.amount}
        3. Your confidence level in this assessment (as a percentage)
        
        Respond in JSON format like this:
        {
          "wasteTypeMatch": true/false,
          "quantityMatch": true/false,
          "confidence": confidence level as a number between 0 and 1
        }`;

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();

      try {
        const parsedResult = JSON.parse(text);
        setVerificationResult({
          wasteTypeMatch: parsedResult.wasteTypeMatch,
          quantityMatch: parsedResult.quantityMatch,
          confidence: parsedResult.confidence,
        });
        setVerificationStatus("success");

        // real logic for verifing
        if (
          parsedResult.wasteTypeMatch &&
          parsedResult.quantityMatch &&
          parsedResult.confidence > 0.7
        ) {
          await handleStatusChange(selectedTask.id, "verified");
          const earnedReward = 20; // fix later

          // Save the reward
          // await saveReward(user.id, earnedReward);

          // Save the collected waste
          // await saveCollectedWaste(selectedTask.id, user.id, parsedResult);

          setReward(earnedReward);
          toast.success(
            `Verification successful! You earned ${earnedReward} tokens!`,
            {
              duration: 5000,
              position: "top-center",
            }
          );
        } else {
          toast.error(
            "Verification failed. The collected waste does not match the reported waste.",
            {
              duration: 5000,
              position: "top-center",
            }
          );
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

  const filteredTasks = tasks.filter((task) =>
    task.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pageCount = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);

  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return <div>Collect Waste Page</div>;
}

export default CollectPage;
