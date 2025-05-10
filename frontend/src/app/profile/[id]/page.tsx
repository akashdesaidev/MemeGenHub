"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/utils/api";
import MemeCard from "@/components/MemeCard";

interface User {
  _id: string;
  name: string;
  image?: string;
  bio?: string;
  createdAt: string;
}

interface Creator {
  _id: string;
  name: string;
  image?: string;
}

interface Meme {
  _id: string;
  title: string;
  imageUrl: string;
  originalImageUrl?: string;
  creator: Creator;
  createdAt: string;
  votes: number;
  commentCount: number;
  status: "draft" | "published";
}

interface PaginationData {
  totalPages: number;
  currentPage: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
  itemsPerPage: number;
}

export default function UserProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationData>({
    totalPages: 1,
    currentPage: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false,
    nextPage: null,
    prevPage: null,
    itemsPerPage: 12,
  });

  // Create a ref for the observer target element
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUserProfile();
    fetchUserMemes(1);
  }, [params.id]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await api.get(`/auth/users/${params.id}`);
      setUser(response.data);
    } catch (err: any) {
      console.error("Error fetching profile:", err);
      setError(err.response?.data?.message || "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserMemes = useCallback(
    async (page = 1) => {
      try {
        if (page === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const response = await api.get(`/memes/user/${params.id}`, {
          params: {
            page,
            limit: 12,
            status: "published",
          },
        });

        // Check if response.data.memes exists and is an array
        const memesData = response.data.memes || [];

        if (!Array.isArray(memesData)) {
          console.error("Expected memes array but got:", memesData);
          // If the response has the old format (direct array), use that instead
          if (Array.isArray(response.data)) {
            if (page === 1) {
              setMemes(
                response.data.filter(
                  (meme: Meme) => meme.status === "published"
                )
              );
            } else {
              setMemes((prev) => [
                ...prev,
                ...response.data.filter(
                  (meme: Meme) => meme.status === "published"
                ),
              ]);
            }

            // Set default pagination since we're using the old API format
            setPagination({
              totalPages: 1,
              currentPage: page,
              totalItems: response.data.length,
              hasNextPage: false,
              hasPrevPage: page > 1,
              nextPage: null,
              prevPage: page > 1 ? page - 1 : null,
              itemsPerPage: 12,
            });
            return;
          }

          // Fallback to empty array if neither format works
          if (page === 1) {
            setMemes([]);
          }
          return;
        }

        if (page === 1) {
          setMemes(memesData);
        } else {
          setMemes((prev) => [...prev, ...memesData]);
        }

        // Update pagination data
        setPagination({
          totalPages: response.data.totalPages || 1,
          currentPage: response.data.currentPage || page,
          totalItems: response.data.totalItems || memesData.length,
          hasNextPage: response.data.hasNextPage || false,
          hasPrevPage: response.data.hasPrevPage || page > 1,
          nextPage: response.data.nextPage || null,
          prevPage: response.data.prevPage || (page > 1 ? page - 1 : null),
          itemsPerPage: response.data.itemsPerPage || 12,
        });
      } catch (err: any) {
        console.error("Error fetching user memes:", err);
        // Set empty array on error
        if (page === 1) {
          setMemes([]);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [params.id]
  );

  // Setup intersection observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          pagination.hasNextPage &&
          !isLoading &&
          !isLoadingMore
        ) {
          if (pagination.nextPage !== null) {
            fetchUserMemes(pagination.nextPage);
          }
        }
      },
      { threshold: 0.5 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [
    pagination.hasNextPage,
    pagination.nextPage,
    isLoading,
    isLoadingMore,
    fetchUserMemes,
  ]);

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

  if (isLoading && !memes.length) {
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
        <div className="mt-4">
          <Link href="/memes" className="text-primary hover:text-primary/90">
            ← Back to memes
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <p>User not found.</p>
          <Link href="/memes" className="btn btn-primary mt-4">
            Browse Memes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/memes" className="text-primary hover:text-primary/90">
          ← Back to memes
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start">
          <div className="mb-6 md:mb-0 md:mr-8">
            <div className="relative h-32 w-32 rounded-full overflow-hidden">
              <Image
                src={getImageUrl(user.image)}
                alt={user.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">{user.name}</h1>

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
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{user.name}'s Memes</h2>
        {pagination.totalItems > 0 && (
          <div className="text-sm text-gray-500">
            Showing {memes.length} of {pagination.totalItems} memes
          </div>
        )}
      </div>

      {memes.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">No memes found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memes.map((meme) => (
            <MemeCard key={meme._id} meme={meme} />
          ))}
        </div>
      )}

      {/* Intersection observer target */}
      <div ref={observerTarget} className="h-10 w-full my-4">
        {isLoadingMore && pagination.hasNextPage && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </div>
  );
}
