"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import MemeCard from "@/components/MemeCard";
import api from "@/utils/api";

// Define interfaces
interface Creator {
  _id: string;
  name: string;
  image?: string;
}

interface Meme {
  _id: string;
  title: string;
  imageUrl: string;
  creator: Creator;
  createdAt: string;
  votes: number;
  commentCount: number;
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

export default function MemesPage() {
  const [memes, setMemes] = useState<Meme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("new");
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

  // Fetch memes function
  const fetchMemes = useCallback(
    async (page = 1) => {
      try {
        setIsLoading(true);
        setError("");

        // Map frontend sort values to backend sort parameters
        let sortParam = sortBy;
        if (sortBy === "new") {
          sortParam = "createdAt";
        }

        const response = await api.get("/memes", {
          params: {
            page,
            limit: 12,
            sort: sortParam,
          },
        });

        if (page === 1) {
          setMemes(response.data.memes);
        } else {
          setMemes((prev) => [...prev, ...response.data.memes]);
        }

        // Update pagination data
        setPagination({
          totalPages: response.data.totalPages,
          currentPage: response.data.currentPage,
          totalItems: response.data.totalItems,
          hasNextPage: response.data.hasNextPage,
          hasPrevPage: response.data.hasPrevPage,
          nextPage: response.data.nextPage,
          prevPage: response.data.prevPage,
          itemsPerPage: response.data.itemsPerPage,
        });
      } catch (err: any) {
        console.error("Error fetching memes:", err);
        setError(err.response?.data?.message || "Failed to load memes");
      } finally {
        setIsLoading(false);
      }
    },
    [sortBy]
  );

  // Reset when sort changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    fetchMemes(1);
  }, [sortBy, fetchMemes]);

  // Setup intersection observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.hasNextPage && !isLoading) {
          if (pagination.nextPage !== null) {
            fetchMemes(pagination.nextPage);
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
  }, [pagination.hasNextPage, pagination.nextPage, isLoading, fetchMemes]);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Browse Memes</h1>
        <Link href="/memes/create" className="btn btn-primary">
          Create Meme
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="mb-6 flex justify-between items-center">
        <select
          className="p-2 border rounded-md"
          value={sortBy}
          onChange={handleSortChange}
          disabled={isLoading}
        >
          <option value="new">New</option>
          <option value="top-day">Top (24h)</option>
          <option value="top-week">Top (Week)</option>
          <option value="votes">Top (All Time)</option>
        </select>

        <div className="text-sm text-gray-500">
          {pagination.totalItems > 0 && (
            <>
              Showing {memes.length} of {pagination.totalItems} memes
            </>
          )}
        </div>
      </div>

      {isLoading && memes.length === 0 ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : memes.length === 0 ? (
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
        {isLoading && pagination.hasNextPage && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </div>
  );
}
