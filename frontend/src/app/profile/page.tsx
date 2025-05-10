"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/utils/api";

interface User {
  _id: string;
  name: string;
  email: string;
  image?: string;
  bio?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/signin?redirect=/profile");
      return;
    }

    fetchUserProfile();
  }, [router]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await api.get("/auth/profile");
      setUser(response.data);
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      setError(err.response?.data?.message || "Failed to load profile");

      // Handle unauthorized error
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        router.push("/auth/signin?redirect=/profile");
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <p>No profile information available.</p>
          <Link href="/auth/signin" className="btn btn-primary mt-4">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row items-center md:items-start">
          <div className="mb-6 md:mb-0 md:mr-8">
            <div className="relative h-32 w-32 rounded-full overflow-hidden">
              <Image
                src={getImageUrl(user.image)}
                alt={user.name}
                fill
                className="object-cover"
                unoptimized
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/images/default-avatar.svg";
                }}
              />
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">{user.name}</h1>
            <p className="text-gray-600 mb-4">{user.email}</p>

            {user.bio && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2">Bio</h2>
                <p className="text-gray-700">{user.bio}</p>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Member Since</h2>
              <p className="text-gray-700">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href="/profile/edit" className="btn btn-primary">
                Edit Profile
              </Link>
              <Link
                href="/profile/change-password"
                className="btn btn-secondary"
              >
                Change Password
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* User's memes section could be added here */}
    </div>
  );
}
