"use client";

import { useState, useEffect, ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import api from "@/utils/api";

interface User {
  _id: string;
  name: string;
  email: string;
  image?: string;
  bio?: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/signin?redirect=/profile/edit");
      return;
    }

    fetchUserProfile();
  }, [router]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await api.get("/auth/profile");
      const userData = response.data;
      setUser(userData);
      setName(userData.name || "");
      setBio(userData.bio || "");
      if (userData.image) {
        setImagePreview(getImageUrl(userData.image));
      }
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      setError(err.response?.data?.message || "Failed to load profile");

      // Handle unauthorized error
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        router.push("/auth/signin?redirect=/profile/edit");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get the full image URL
  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return "/images/default-avatar.svg";

    // If the image path already includes http/https, use it as is
    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    // If it's a data URL (from file preview), use it as is
    if (imagePath.startsWith("data:")) {
      return imagePath;
    }

    // Otherwise, prepend the backend URL
    return `http://localhost:5000${imagePath}`;
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");

      // Prepare form data
      const formData = new FormData();
      formData.append("name", name);
      formData.append("bio", bio || "");

      if (imageFile) {
        formData.append("profileImage", imageFile);
      }

      // Send update request
      const response = await api.put("/auth/profile", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSuccessMessage("Profile updated successfully!");

      // Update local user data
      setUser(response.data);

      // Update image in Header component by dispatching a custom event
      const updateProfileEvent = new Event("profile-updated");
      window.dispatchEvent(updateProfileEvent);

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/profile");
      }, 2000);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  console.log(imagePreview);
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Profile Picture</label>
            <div className="flex items-center">
              <div className="relative h-24 w-24 rounded-full overflow-hidden mr-4">
                <Image
                  src={imagePreview ? imagePreview : getImageUrl(user?.image)}
                  alt="Profile Preview"
                  fill
                  className="object-cover"
                  unoptimized
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/default-avatar.svg";
                  }}
                />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0 file:text-sm file:font-semibold
                file:bg-primary file:text-white hover:file:bg-primary/90"
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="bio" className="block text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={4}
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => router.back()}
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
