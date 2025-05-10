"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import api from "@/utils/api";

// Mock templates with local images
const templates = [
  {
    id: "template1",
    name: "Exam Hall",
    url: "/images/templates/template1.webp",
  },
  {
    id: "template2",
    name: "Distracted",
    url: "/images/templates/template2.webp",
  },
  {
    id: "template3",
    name: "Victory celebration",
    url: "/images/templates/template3.jpg",
  },
  {
    id: "template4",
    name: "Step on Something",
    url: "/images/templates/template4.jpg",
  },
];

export default function CreateMemePage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [fontSize, setFontSize] = useState(32);
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/signin?redirect=/memes/create");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  useEffect(() => {
    // Generate preview when text, color, font size, or image changes
    if (selectedTemplate || uploadedImage) {
      generatePreview();
    }
  }, [
    topText,
    bottomText,
    fontSize,
    textColor,
    selectedTemplate,
    uploadedImage,
  ]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setUploadedImage(null);
    setPreviewUrl(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        setSelectedTemplate(null);
        setPreviewUrl(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const getImageUrl = () => {
    if (uploadedImage) return uploadedImage;
    if (selectedTemplate) {
      const template = templates.find((t) => t.id === selectedTemplate);
      return template?.url || "";
    }
    return "";
  };

  const generatePreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = getImageUrl();

    img.onload = () => {
      // Set canvas dimensions to match image aspect ratio
      const aspectRatio = img.width / img.height;
      canvas.width = 800;
      canvas.height = 800 / aspectRatio;

      // Clear canvas and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Set text style
      ctx.textAlign = "center";
      ctx.fillStyle = textColor;
      ctx.strokeStyle = "black";
      ctx.lineWidth = 4;

      // Calculate font size based on canvas width
      const fontSizeScaled = (fontSize / 64) * canvas.width * 0.08;
      ctx.font = `bold ${fontSizeScaled}px Impact, sans-serif`;

      // Draw top text
      if (topText) {
        ctx.fillStyle = textColor;
        ctx.strokeText(topText, canvas.width / 2, fontSizeScaled + 10);
        ctx.fillText(topText, canvas.width / 2, fontSizeScaled + 10);
      }

      // Draw bottom text
      if (bottomText) {
        ctx.fillStyle = textColor;
        ctx.strokeText(bottomText, canvas.width / 2, canvas.height - 20);
        ctx.fillText(bottomText, canvas.width / 2, canvas.height - 20);
      }

      // Convert canvas to data URL for preview
      setPreviewUrl(canvas.toDataURL("image/png"));
    };
  };

  const handleSaveMeme = async (status: "draft" | "published") => {
    try {
      if (!title) {
        setError("Please provide a title for your meme");
        return;
      }

      if (!selectedTemplate && !uploadedImage) {
        setError("Please select a template or upload an image");
        return;
      }

      setIsLoading(true);
      setError("");

      // Prepare the image data
      let imageData = "";
      if (previewUrl) {
        imageData = previewUrl;
      } else if (uploadedImage) {
        imageData = uploadedImage;
      } else if (selectedTemplate) {
        const template = templates.find((t) => t.id === selectedTemplate);
        imageData = template?.url || "";
      }

      // Send request to create meme using our API utility
      const response = await api.post("/memes", {
        title,
        topText,
        bottomText,
        textColor,
        fontSize,
        imageData,
        status,
      });

      if (response.data) {
        // Redirect to the meme page or dashboard
        if (status === "published") {
          router.push(`/memes/${response.data._id}`);
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save meme");
      console.error("Error saving meme:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render the form until we confirm the user is authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Create a Meme</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Template Selection */}
        <div className="lg:col-span-1">
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Choose a Template</h2>
            <div className="grid grid-cols-2 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`cursor-pointer border-2 rounded-md overflow-hidden ${
                    selectedTemplate === template.id
                      ? "border-primary"
                      : "border-gray-200"
                  }`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <div className="relative h-32 w-full">
                    <Image
                      src={template.url}
                      alt={template.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-2 text-center text-sm truncate">
                    {template.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Or Upload Your Own</h2>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Center Column - Meme Preview */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Preview</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter meme title"
                disabled={isLoading}
              />
            </div>

            {selectedTemplate || uploadedImage ? (
              <div className="relative w-full h-80">
                {/* Hidden canvas for meme generation */}
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {/* Display the preview image */}
                <Image
                  src={previewUrl || getImageUrl()}
                  alt="Meme Preview"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 bg-gray-100 rounded-md">
                <p className="text-gray-500">
                  Select a template or upload an image
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Text Controls */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Customize Text</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Top Text</label>
              <input
                type="text"
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter top text"
                disabled={isLoading}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Bottom Text
              </label>
              <input
                type="text"
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter bottom text"
                disabled={isLoading}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Font Size: {fontSize}px
              </label>
              <input
                type="range"
                min="16"
                max="64"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full"
                disabled={isLoading}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">
                Text Color
              </label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-full h-10"
                disabled={isLoading}
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => handleSaveMeme("draft")}
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1"
                onClick={() => handleSaveMeme("published")}
                disabled={isLoading}
              >
                {isLoading ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
