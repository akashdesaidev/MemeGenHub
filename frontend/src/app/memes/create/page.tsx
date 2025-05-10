"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import api from "@/utils/api";
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

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

// Function to create a centered square crop
function centerSquareCrop(width: number, height: number): Crop {
  const size = Math.min(width, height);
  return {
    unit: "%",
    width: (size / width) * 100,
    height: (size / height) * 100,
    x: ((width - size) / 2 / width) * 100,
    y: ((height - size) / 2 / height) * 100,
  };
}

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
  // New states for animation
  const [topTextAnimating, setTopTextAnimating] = useState(false);
  const [bottomTextAnimating, setBottomTextAnimating] = useState(false);
  const [topTextPosition, setTopTextPosition] = useState({ x: 50, y: 10 }); // % values
  const [bottomTextPosition, setBottomTextPosition] = useState({
    x: 50,
    y: 90,
  }); // % values
  const [isDraggingTop, setIsDraggingTop] = useState(false);
  const [isDraggingBottom, setIsDraggingBottom] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [showOverlayText, setShowOverlayText] = useState(true);

  // New states for image cropping
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropping, setIsCropping] = useState(false);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const [aspect, setAspect] = useState<number | undefined>(1); // Default to square (1:1)

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/signin?redirect=/memes/create");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // We don't need to auto-generate preview anymore, as we'll only use the canvas for final image
  // The draggable overlay text will be the only thing visible during editing

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setUploadedImage(null);
    setPreviewUrl(null);
    setCroppedImage(null);
    setIsCropping(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        setSelectedTemplate(null);
        setPreviewUrl(null);
        setCroppedImage(null);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Function to handle image load and set initial crop
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setImgDimensions({ width, height });

    // Set default crop to centered square
    const initialCrop = centerSquareCrop(width, height);
    setCrop(initialCrop);
  };

  // Function to apply the crop to the image
  const applyCrop = () => {
    if (!imgRef.current || !completedCrop) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    const croppedImageUrl = canvas.toDataURL("image/jpeg");
    setCroppedImage(croppedImageUrl);
    setIsCropping(false);
  };

  const cancelCrop = () => {
    setIsCropping(false);
    if (!croppedImage) {
      // If no previous crop exists, reset the uploaded image
      setUploadedImage(null);
    }
  };

  const getImageUrl = () => {
    if (croppedImage) return croppedImage;
    if (uploadedImage && !isCropping) return uploadedImage;
    if (selectedTemplate) {
      const template = templates.find((t) => t.id === selectedTemplate);
      return template?.url || "";
    }
    return "";
  };

  // Handle drag start for text elements
  const handleDragStart =
    (textType: "top" | "bottom") => (e: React.MouseEvent) => {
      e.preventDefault();
      if (textType === "top") {
        setIsDraggingTop(true);
      } else {
        setIsDraggingBottom(true);
      }
    };

  // Modified function to handle mouse move with direct pixel tracking
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTop && !isDraggingBottom) return;

    const container = previewContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    // Get position relative to the container
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Constrain to container bounds
    const boundedX = Math.max(0, Math.min(100, x));
    const boundedY = Math.max(0, Math.min(100, y));

    if (isDraggingTop) {
      setTopTextPosition({ x: boundedX, y: boundedY });
    } else if (isDraggingBottom) {
      setBottomTextPosition({ x: boundedX, y: boundedY });
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDraggingTop(false);
    setIsDraggingBottom(false);
  };

  // Add event listeners for mouse up event
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDraggingTop(false);
      setIsDraggingBottom(false);
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Handle touch move for mobile devices
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingTop && !isDraggingBottom) return;

    // Prevent scrolling while dragging
    e.preventDefault();

    const container = previewContainerRef.current;
    if (!container) return;

    const touch = e.touches[0];
    const rect = container.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;

    // Constrain to container bounds
    const boundedX = Math.max(0, Math.min(100, x));
    const boundedY = Math.max(0, Math.min(100, y));

    if (isDraggingTop) {
      setTopTextPosition({ x: boundedX, y: boundedY });
    } else if (isDraggingBottom) {
      setBottomTextPosition({ x: boundedX, y: boundedY });
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    setIsDraggingTop(false);
    setIsDraggingBottom(false);
  };

  // Add event listeners for touch events
  useEffect(() => {
    const handleTouchEndGlobal = () => {
      setIsDraggingTop(false);
      setIsDraggingBottom(false);
    };

    window.addEventListener("touchend", handleTouchEndGlobal);
    return () => {
      window.removeEventListener("touchend", handleTouchEndGlobal);
    };
  }, []);

  // This function will now only be used during the save process
  const generateFinalImage = () => {
    return new Promise<string>((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        reject("Canvas not available");
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject("Canvas context not available");
        return;
      }

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
        ctx.lineWidth = 2;

        // Calculate font size based on canvas width
        const fontSizeScaled = (fontSize / 64) * canvas.width * 0.08;
        ctx.font = `bold ${fontSizeScaled}px Impact, sans-serif`;

        // Use direct percentage positioning
        const topX = (topTextPosition.x / 100) * canvas.width;
        const topY = (topTextPosition.y / 100) * canvas.height;
        const bottomX = (bottomTextPosition.x / 100) * canvas.width;
        const bottomY = (bottomTextPosition.y / 100) * canvas.height;

        // Draw top text at exact position
        if (topText) {
          ctx.fillStyle = textColor;

          // Add text shadow for better visibility
          ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          // Use middle baseline for vertical centering
          ctx.textBaseline = "middle";
          ctx.fillText(topText, topX, topY);

          // Reset shadow for stroke
          ctx.shadowColor = "transparent";
          ctx.strokeText(topText, topX, topY);
        }

        // Draw bottom text at exact position
        if (bottomText) {
          ctx.fillStyle = textColor;

          // Add text shadow for better visibility
          ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          // Use middle baseline for vertical centering
          ctx.textBaseline = "middle";
          ctx.fillText(bottomText, bottomX, bottomY);

          // Reset shadow for stroke
          ctx.shadowColor = "transparent";
          ctx.strokeText(bottomText, bottomX, bottomY);
        }

        // Add a small delay to ensure canvas is fully rendered before converting to data URL
        setTimeout(() => {
          // Convert canvas to data URL for final image
          const finalImageData = canvas.toDataURL("image/png");
          resolve(finalImageData);
        }, 100);
      };

      img.onerror = () => {
        reject("Failed to load image");
      };
    });
  };

  const handleSaveMeme = async (status: "draft" | "published") => {
    try {
      if (!title) {
        setError("Please provide a title for your meme");
        return;
      }

      if (!selectedTemplate && !uploadedImage && !croppedImage) {
        setError("Please select a template or upload an image");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        // Generate the final image with text rendered on canvas
        const finalImageData = await generateFinalImage();

        // Send request to create meme using our API utility
        const response = await api.post("/memes", {
          title,
          topText,
          bottomText,
          textColor,
          fontSize,
          imageData: finalImageData,
          status,
          topTextPosition,
          bottomTextPosition,
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
        setError(
          typeof err === "string" ? err : "Failed to generate meme image"
        );
        console.error("Error generating image:", err);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save meme");
      console.error("Error saving meme:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the text input handlers to trigger animations
  const handleTopTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopText(e.target.value);
    setTopTextAnimating(true);
    setTimeout(() => setTopTextAnimating(false), 500);
  };

  const handleBottomTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBottomText(e.target.value);
    setBottomTextAnimating(true);
    setTimeout(() => setBottomTextAnimating(false), 500);
  };

  // Toggle aspect ratio between square (1:1) and free-form (undefined)
  const toggleAspectRatio = () => {
    setAspect(aspect ? undefined : 1);

    // If we're switching to square, recalculate the crop
    if (!aspect && imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerSquareCrop(width, height));
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

      {/* Mobile-specific controls for small screens */}
      <div className="lg:hidden mb-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Meme Title</h2>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border rounded-md text-lg"
            placeholder="Enter meme title"
            disabled={isLoading}
          />
        </div>
      </div>

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
            <label className="block w-full">
              <span className="sr-only">Choose image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4
                file:rounded-md file:border-0 file:text-sm file:font-semibold
                file:bg-primary file:text-white hover:file:bg-primary/90"
                disabled={isLoading}
              />
            </label>
          </div>
        </div>

        {/* Center Column - Meme Preview */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Preview</h2>

            <div className="mb-4 hidden lg:block">
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

            {/* Cropping UI */}
            {isCropping && uploadedImage ? (
              <div className="flex flex-col gap-4">
                <div
                  className="relative w-full"
                  style={{ maxHeight: "400px", overflow: "hidden" }}
                >
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspect}
                    className="max-h-[400px] mx-auto"
                  >
                    <img
                      ref={imgRef}
                      src={uploadedImage}
                      alt="Upload for cropping"
                      onLoad={onImageLoad}
                      className="max-w-full max-h-[400px] mx-auto"
                    />
                  </ReactCrop>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="square-aspect"
                      checked={aspect === 1}
                      onChange={toggleAspectRatio}
                      className="mr-2"
                    />
                    <label htmlFor="square-aspect" className="text-sm">
                      Square aspect ratio (recommended)
                    </label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={applyCrop}
                    className="btn btn-primary py-2 flex-1"
                    disabled={!completedCrop}
                  >
                    Apply Crop
                  </button>
                  <button
                    onClick={cancelCrop}
                    className="btn btn-secondary py-2 flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : selectedTemplate || uploadedImage || croppedImage ? (
              <div
                className="relative w-full h-80"
                ref={previewContainerRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleDragEnd}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Hidden canvas for final image generation only */}
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {/* Display the base image */}
                <Image
                  src={getImageUrl()}
                  alt="Meme Preview"
                  fill
                  className="object-contain"
                  priority
                />

                {/* Text overlays with drag functionality */}
                {topText && (
                  <div
                    className={`absolute text-center font-bold transition-all duration-300 ease-in-out ${
                      topTextAnimating
                        ? "opacity-0 transform -translate-y-2"
                        : "opacity-100"
                    } ${isDraggingTop ? "cursor-grabbing" : "cursor-grab"}`}
                    style={{
                      fontSize: `${fontSize * 0.5}px`,
                      color: textColor,
                      zIndex: 10,
                      pointerEvents: "auto",
                      letterSpacing: "0.05rem",
                      position: "absolute",
                      fontWeight: "bold",
                      textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)",
                      left: `${topTextPosition.x}%`,
                      top: `${topTextPosition.y}%`,
                      transform: "translate(-50%, -50%)", // Center the text at the exact position
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "4px",
                      fontFamily: "Impact, sans-serif",
                    }}
                    onMouseDown={handleDragStart("top")}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setIsDraggingTop(true);
                    }}
                  >
                    {topText}
                  </div>
                )}

                {bottomText && (
                  <div
                    className={`absolute text-center font-bold transition-all duration-300 ease-in-out ${
                      bottomTextAnimating
                        ? "opacity-0 transform translate-y-2"
                        : "opacity-100"
                    } ${isDraggingBottom ? "cursor-grabbing" : "cursor-grab"}`}
                    style={{
                      fontSize: `${fontSize * 0.5}px`,
                      color: textColor,
                      zIndex: 10,
                      pointerEvents: "auto",
                      letterSpacing: "0.05rem",
                      position: "absolute",
                      fontWeight: "bold",
                      textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)",
                      left: `${bottomTextPosition.x}%`,
                      top: `${bottomTextPosition.y}%`,
                      transform: "translate(-50%, -50%)", // Center the text at the exact position
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "4px",
                      fontFamily: "Impact, sans-serif",
                    }}
                    onMouseDown={handleDragStart("bottom")}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setIsDraggingBottom(true);
                    }}
                  >
                    {bottomText}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 bg-gray-100 rounded-md">
                <p className="text-gray-500">
                  Select a template or upload an image
                </p>
              </div>
            )}

            {(selectedTemplate || croppedImage) &&
              (topText || bottomText) &&
              !isCropping && (
                <div className="mt-2 text-sm text-gray-500 text-center">
                  Drag text to reposition it on the image
                </div>
              )}

            {/* Show edit button for cropped images */}
            {croppedImage && uploadedImage && (
              <div className="mt-3">
                <button
                  onClick={() => setIsCropping(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Edit crop
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Text Controls */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Customize Text</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Top Text</label>
              <input
                type="text"
                value={topText}
                onChange={handleTopTextChange}
                className="w-full p-3 border rounded-md text-lg"
                placeholder="Enter top text"
                disabled={isLoading || isCropping}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Bottom Text
              </label>
              <input
                type="text"
                value={bottomText}
                onChange={handleBottomTextChange}
                className="w-full p-3 border rounded-md text-lg"
                placeholder="Enter bottom text"
                disabled={isLoading || isCropping}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Font Size: {fontSize}px
              </label>
              <input
                type="range"
                min="16"
                max="64"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full h-8"
                disabled={isLoading || isCropping}
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium mb-2">
                Text Color
              </label>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-full h-12"
                disabled={isLoading || isCropping}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                className="btn btn-secondary py-3 text-lg"
                onClick={() => handleSaveMeme("draft")}
                disabled={isLoading || isCropping}
              >
                {isLoading ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                className="btn btn-primary py-3 text-lg"
                onClick={() => handleSaveMeme("published")}
                disabled={isLoading || isCropping}
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
