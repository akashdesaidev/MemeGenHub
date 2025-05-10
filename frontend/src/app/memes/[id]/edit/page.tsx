"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import api from "@/utils/api";
import Link from "next/link";

interface Meme {
  _id: string;
  title: string;
  imageUrl: string;
  originalImageUrl?: string;
  topText?: string;
  bottomText?: string;
  textColor?: string;
  fontSize?: number;
  creator: {
    _id: string;
    name: string;
  };
  status: "draft" | "published";
}

export default function EditMemePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [meme, setMeme] = useState<Meme | null>(null);
  const [title, setTitle] = useState("");
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [fontSize, setFontSize] = useState(32);
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchMeme();
  }, [params.id]);

  const fetchMeme = async () => {
    try {
      setIsLoading(true);
      setError("");
      setImageError(false);

      const response = await api.get(`/memes/${params.id}`);
      const memeData = response.data;

      setMeme(memeData);
      setTitle(memeData.title);
      setTopText(memeData.topText || "");
      setBottomText(memeData.bottomText || "");
      setFontSize(memeData.fontSize || 32);
      setTextColor(memeData.textColor || "#FFFFFF");
      setStatus(memeData.status);

      // Set preview URL to the current image
      setPreviewUrl(memeData.imageUrl);
    } catch (err: any) {
      console.error("Error fetching meme:", err);
      setError(err.response?.data?.message || "Failed to load meme");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageError = () => {
    // If image fails to load and we have an original image URL, use that instead
    if (meme?.originalImageUrl && !imageError) {
      setImageError(true);
      setPreviewUrl(meme.originalImageUrl);
      console.log("Using original image URL as fallback");
    }
  };

  const handleSaveMeme = async (newStatus?: "draft" | "published") => {
    try {
      if (!title) {
        setError("Please provide a title for your meme");
        return;
      }

      setIsSaving(true);
      setError("");

      const response = await api.put(`/memes/${params.id}`, {
        title,
        topText,
        bottomText,
        textColor,
        fontSize,
        status: newStatus || status,
      });

      // Redirect back to the meme page
      router.push(`/memes/${params.id}`);
    } catch (err: any) {
      console.error("Error updating meme:", err);
      setError(err.response?.data?.message || "Failed to update meme");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !meme) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error || "Meme not found"}
        </div>
        <div className="mt-4">
          <Link
            href="/dashboard"
            className="text-primary hover:text-primary/90"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href={`/memes/${params.id}`}
          className="text-primary hover:text-primary/90"
        >
          ← Back to meme
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-8">Edit Meme</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Preview */}
        <div className="lg:col-span-2">
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
                disabled={isSaving}
              />
            </div>

            <div className="relative w-full h-[400px]">
              {previewUrl && (
                <Image
                  src={previewUrl}
                  alt="Meme Preview"
                  fill
                  className="object-contain"
                  onError={handleImageError}
                  priority
                />
              )}

              {!imageError && topText && (
                <div
                  className="absolute top-4 left-0 w-full text-center font-bold"
                  style={{
                    fontSize: `${fontSize}px`,
                    color: textColor,
                  }}
                >
                  {topText}
                </div>
              )}

              {!imageError && bottomText && (
                <div
                  className="absolute bottom-4 left-0 w-full text-center font-bold"
                  style={{
                    fontSize: `${fontSize}px`,
                    color: textColor,
                  }}
                >
                  {bottomText}
                </div>
              )}
            </div>
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
                disabled={isSaving}
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
                disabled={isSaving}
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
                disabled={isSaving}
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
                disabled={isSaving}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "draft" | "published")
                }
                className="w-full p-2 border rounded-md"
                disabled={isSaving}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => handleSaveMeme()}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <Link
                href={`/memes/${params.id}`}
                className="btn btn-outline flex-1 text-center"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
