"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/utils/api";

interface Creator {
  _id: string;
  name: string;
  image?: string;
}

interface Meme {
  _id: string;
  title: string;
  imageUrl: string;
}

interface FlaggedComment {
  _id: string;
  text: string;
  creator: Creator;
  meme: Meme;
  createdAt: string;
  flagged: boolean;
  flagCount: number;
}

export default function FlaggedCommentsPage() {
  const router = useRouter();
  const [comments, setComments] = useState<FlaggedComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processingComment, setProcessingComment] = useState<string | null>(
    null
  );

  useEffect(() => {
    // Check if user is authenticated and is admin
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);

    checkAdminStatus();
    if (token) {
      fetchFlaggedComments(currentPage);
    }
  }, [currentPage]);

  const checkAdminStatus = async () => {
    try {
      const response = await api.get("/auth/me");
      setIsAdmin(response.data.role === "admin");

      if (response.data.role !== "admin") {
        // Redirect non-admin users
        router.push("/");
      }
    } catch (err) {
      console.error("Error checking admin status:", err);
      router.push("/auth/signin");
    }
  };

  const fetchFlaggedComments = async (page: number) => {
    try {
      setIsLoading(true);
      setError("");

      const response = await api.get(`/comments/flagged/all?page=${page}`);
      setComments(response.data.comments || []);
      setTotalPages(response.data.totalPages || 1);
      setCurrentPage(response.data.currentPage || 1);
    } catch (err: any) {
      console.error("Error fetching flagged comments:", err);
      setError(
        err.response?.data?.message || "Failed to load flagged comments"
      );
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

    // Otherwise, prepend the backend URL
    return `http://localhost:5000${imagePath}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDeleteComment = async (commentId: string) => {
    if (
      !isAdmin ||
      !window.confirm("Are you sure you want to delete this comment?")
    ) {
      return;
    }

    try {
      setProcessingComment(commentId);
      await api.delete(`/comments/${commentId}`);

      // Remove the comment from the list
      setComments(comments.filter((comment) => comment._id !== commentId));

      alert("Comment deleted successfully");
    } catch (err: any) {
      console.error("Error deleting comment:", err);
      alert(err.response?.data?.message || "Failed to delete comment");
    } finally {
      setProcessingComment(null);
    }
  };

  const handleUnflagComment = async (commentId: string) => {
    if (!isAdmin) {
      return;
    }

    try {
      setProcessingComment(commentId);

      // This would require a new endpoint in the backend
      await api.post(`/comments/${commentId}/unflag`);

      // Update the comment in the list
      setComments(comments.filter((comment) => comment._id !== commentId));

      alert("Comment unflagged successfully");
    } catch (err: any) {
      console.error("Error unflagging comment:", err);
      alert(err.response?.data?.message || "Failed to unflag comment");
    } finally {
      setProcessingComment(null);
    }
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          You do not have permission to view this page
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Flagged Comments</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="card">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No flagged comments found
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <div
                key={comment._id}
                className="border border-red-100 rounded-md p-4 bg-red-50"
              >
                <div className="flex items-start">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden mr-3">
                    <Image
                      src={getImageUrl(comment.creator.image)}
                      alt={comment.creator.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex-grow">
                    <div className="flex flex-wrap justify-between items-start">
                      <div>
                        <Link
                          href={`/profile/${comment.creator._id}`}
                          className="font-medium hover:text-primary"
                        >
                          {comment.creator.name}
                        </Link>
                        <span className="text-sm text-gray-500 ml-2">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1 sm:mt-0">
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">
                          Flagged {comment.flagCount} times
                        </span>
                        <button
                          onClick={() => handleUnflagComment(comment._id)}
                          disabled={processingComment === comment._id}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded"
                        >
                          {processingComment === comment._id
                            ? "Processing..."
                            : "Unflag"}
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment._id)}
                          disabled={processingComment === comment._id}
                          className="text-xs px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded"
                        >
                          {processingComment === comment._id
                            ? "Processing..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-gray-800">{comment.text}</p>
                    <div className="mt-2 text-sm">
                      <Link
                        href={`/memes/${comment.meme._id}`}
                        className="text-primary hover:underline"
                      >
                        View on meme: {comment.meme.title}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <nav className="inline-flex rounded-md shadow">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 border-t border-b border-gray-300 bg-white text-sm font-medium text-gray-700">
                {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
