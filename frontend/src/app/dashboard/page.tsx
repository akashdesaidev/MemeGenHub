"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import api from "@/utils/api";
import { useRouter } from "next/navigation";

// Define the Meme interface
interface Meme {
  _id: string;
  title: string;
  imageUrl: string;
  originalImageUrl?: string;
  topText?: string;
  bottomText?: string;
  textColor?: string;
  fontSize?: number;
  creator: string;
  status: "draft" | "published";
  views: number;
  votes: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
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

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "published" | "draft">(
    "all"
  );
  const [memes, setMemes] = useState<Meme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pagination, setPagination] = useState<PaginationData>({
    totalPages: 1,
    currentPage: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false,
    nextPage: null,
    prevPage: null,
    itemsPerPage: 10,
  });

  useEffect(() => {
    // Prevent redirect loops by checking if we're already redirecting
    const isRedirecting = sessionStorage.getItem("redirecting");
    if (isRedirecting) {
      console.log("Already redirecting, preventing loop");
      sessionStorage.removeItem("redirecting");
      return;
    }

    // Check if user is authenticated
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("No token found, redirecting to signin");
      sessionStorage.setItem("redirecting", "true");
      router.push("/auth/signin?redirect=/dashboard");
    } else {
      // Validate token format
      try {
        // Basic check: token should be a JWT with 3 parts
        const parts = token.split(".");
        if (parts.length !== 3) {
          throw new Error("Invalid token format");
        }

        // Check if token is expired
        const payload = JSON.parse(atob(parts[1]));

        // Log the payload for debugging
        console.log("Token payload:", {
          userId: payload.userId,
          exp: payload.exp,
          currentTime: Date.now(),
          isExpired: payload.exp * 1000 < Date.now(),
        });

        if (!payload.userId) {
          throw new Error("Token missing userId");
        }

        if (payload.exp * 1000 < Date.now()) {
          throw new Error("Token expired");
        }

        // Validate userId format (should be a MongoDB ObjectId)
        if (!/^[0-9a-fA-F]{24}$/.test(payload.userId)) {
          throw new Error("Invalid userId format in token");
        }

        setIsAuthenticated(true);
        fetchMemes();
        checkAdminStatus();
      } catch (err) {
        console.error("Invalid token:", err);
        localStorage.removeItem("token");
        sessionStorage.setItem("redirecting", "true");
        router.push("/auth/signin?redirect=/dashboard");
      }
    }

    // Clear the redirecting flag after a short delay
    return () => {
      setTimeout(() => {
        sessionStorage.removeItem("redirecting");
      }, 2000);
    };
  }, [router]);

  // Check if user is an admin
  const checkAdminStatus = async () => {
    try {
      const response = await api.get("/auth/me");
      setIsAdmin(response.data.role === "admin");
    } catch (err) {
      console.error("Error checking admin status:", err);
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

  const fetchMemes = async (status?: string, page = 1) => {
    try {
      setIsLoading(true);
      setError("");

      // Construct query parameters for filtering by status
      const params: any = { page, limit: 10 };
      if (status && status !== "all") {
        params.status = status;
      }

      const response = await api.get("/memes/user/", { params });

      // Check if response.data is an array or if it has a memes property
      if (Array.isArray(response.data)) {
        // Old API format - direct array
        setMemes(response.data);
        setPagination({
          totalPages: 1,
          currentPage: page,
          totalItems: response.data.length,
          hasNextPage: false,
          hasPrevPage: page > 1,
          nextPage: null,
          prevPage: page > 1 ? page - 1 : null,
          itemsPerPage: 10,
        });
      } else if (response.data && Array.isArray(response.data.memes)) {
        // New API format with pagination
        setMemes(response.data.memes);
        setPagination({
          totalPages: response.data.totalPages || 1,
          currentPage: response.data.currentPage || page,
          totalItems: response.data.totalItems || response.data.memes.length,
          hasNextPage: response.data.hasNextPage || false,
          hasPrevPage: response.data.hasPrevPage || page > 1,
          nextPage: response.data.nextPage || null,
          prevPage: response.data.prevPage || (page > 1 ? page - 1 : null),
          itemsPerPage: response.data.itemsPerPage || 10,
        });
      } else {
        console.error("Unexpected API response format:", response.data);
        setMemes([]);
        setPagination({
          totalPages: 1,
          currentPage: 1,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false,
          nextPage: null,
          prevPage: null,
          itemsPerPage: 10,
        });
      }
    } catch (err: any) {
      console.error("Error fetching memes:", err);
      const errorMessage =
        err.response?.data?.message || "Failed to load memes";
      setError(errorMessage);

      // Handle specific error cases
      if (err.response?.status === 401) {
        // Unauthorized - token might be invalid
        localStorage.removeItem("token");
        router.push("/auth/signin?redirect=/dashboard");
      } else if (
        err.response?.status === 400 &&
        errorMessage.includes("Invalid") &&
        errorMessage.includes("ID format")
      ) {
        // Invalid ID format - likely an issue with the token's user ID
        // localStorage.removeItem("token");
        // router.push("/auth/signin?redirect=/dashboard");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: "all" | "published" | "draft") => {
    setActiveTab(tab);
    fetchMemes(tab === "all" ? undefined : tab, 1);
  };

  const handlePageChange = (newPage: number) => {
    fetchMemes(activeTab === "all" ? undefined : activeTab, newPage);
  };

  const handleDeleteMeme = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this meme?")) {
      return;
    }

    try {
      await api.delete(`/memes/${id}`);
      // Refresh memes list after deletion
      fetchMemes(
        activeTab === "all" ? undefined : activeTab,
        pagination.currentPage
      );
    } catch (err: any) {
      console.error("Error deleting meme:", err);
      alert(err.response?.data?.message || "Failed to delete meme");
    }
  };

  // Don't render the dashboard until we confirm the user is authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <Link href="/memes/create" className="btn btn-primary">
          Create New Meme
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {isAdmin && (
        <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h2 className="text-xl font-semibold mb-2">Admin Tools</h2>
          <div className="flex space-x-4">
            <Link
              href="/dashboard/flagged-comments"
              className="text-primary hover:underline flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z"
                  clipRule="evenodd"
                />
              </svg>
              Flagged Comments
            </Link>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium ${
                activeTab === "all"
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => handleTabChange("all")}
            >
              All Memes
            </button>
            <button
              className={`py-4 px-6 font-medium ${
                activeTab === "published"
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => handleTabChange("published")}
            >
              Published
            </button>
            <button
              className={`py-4 px-6 font-medium ${
                activeTab === "draft"
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => handleTabChange("draft")}
            >
              Drafts
            </button>
          </nav>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : memes.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">No memes found</p>
          <Link href="/memes/create" className="btn btn-primary mt-4">
            Create your first meme
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Meme
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Views
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Votes
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Comments
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {memes.map((meme) => (
                  <tr key={meme._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-16 flex-shrink-0 mr-4 relative">
                          <Image
                            src={meme.imageUrl}
                            alt={meme.title}
                            fill
                            className="object-cover rounded"
                            unoptimized
                            onError={(e) => {
                              console.log(
                                `Image failed to load in dashboard: ${meme.imageUrl}`
                              );
                              // If image fails to load and we have an original image URL, use that instead
                              if (meme.originalImageUrl) {
                                console.log(
                                  `Trying original image: ${meme.originalImageUrl}`
                                );
                                (e.target as HTMLImageElement).src =
                                  meme.originalImageUrl;
                                // Add a second error handler for the fallback image
                                (e.target as HTMLImageElement).onerror = () => {
                                  console.log(
                                    `Original image also failed to load: ${meme.originalImageUrl}`
                                  );
                                  // If the original image also fails, use a placeholder
                                  (e.target as HTMLImageElement).src =
                                    "https://placehold.co/300x200/e0e0e0/969696?text=Image+Not+Available";
                                  // Remove the error handler to prevent infinite loops
                                  (e.target as HTMLImageElement).onerror = null;
                                };
                              } else {
                                // If no original image, use placeholder directly
                                (e.target as HTMLImageElement).src =
                                  "https://placehold.co/300x200/e0e0e0/969696?text=Image+Not+Available";
                                // Remove the error handler to prevent infinite loops
                                (e.target as HTMLImageElement).onerror = null;
                              }
                            }}
                          />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {meme.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(meme.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {meme.views}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {meme.votes}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {meme.commentCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          meme.status === "published"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {meme.status === "published" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/memes/${meme._id}`}
                        className="text-primary hover:text-primary/90 mr-4"
                      >
                        View
                      </Link>
                      <Link
                        href={`/memes/${meme._id}/edit`}
                        className="text-primary hover:text-primary/90 mr-4"
                      >
                        Edit
                      </Link>
                      <button
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeleteMeme(meme._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() =>
                  pagination.hasPrevPage &&
                  handlePageChange(pagination.currentPage - 1)
                }
                disabled={!pagination.hasPrevPage}
                className={`relative inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${
                  pagination.hasPrevPage
                    ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    : "border-gray-200 bg-gray-100 text-gray-400"
                }`}
              >
                Previous
              </button>
              <button
                onClick={() =>
                  pagination.hasNextPage &&
                  handlePageChange(pagination.currentPage + 1)
                }
                disabled={!pagination.hasNextPage}
                className={`relative ml-3 inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium ${
                  pagination.hasNextPage
                    ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    : "border-gray-200 bg-gray-100 text-gray-400"
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {memes.length > 0
                      ? (pagination.currentPage - 1) * pagination.itemsPerPage +
                        1
                      : 0}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(
                      pagination.currentPage * pagination.itemsPerPage,
                      pagination.totalItems
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">{pagination.totalItems}</span>{" "}
                  results
                </p>
              </div>
              <div>
                <nav
                  className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                  aria-label="Pagination"
                >
                  <button
                    onClick={() =>
                      pagination.hasPrevPage &&
                      handlePageChange(pagination.currentPage - 1)
                    }
                    disabled={!pagination.hasPrevPage}
                    className={`relative inline-flex items-center rounded-l-md px-2 py-2 ${
                      pagination.hasPrevPage
                        ? "text-gray-400 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                        : "text-gray-300 bg-gray-50"
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* Page numbers */}
                  {Array.from(
                    { length: pagination.totalPages },
                    (_, i) => i + 1
                  )
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === pagination.totalPages ||
                        (page >= pagination.currentPage - 1 &&
                          page <= pagination.currentPage + 1)
                    )
                    .map((page, index, array) => {
                      // Add ellipsis
                      if (index > 0 && page > array[index - 1] + 1) {
                        return (
                          <span
                            key={`ellipsis-${page}`}
                            className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0"
                          >
                            ...
                          </span>
                        );
                      }

                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          aria-current={
                            pagination.currentPage === page ? "page" : undefined
                          }
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                            pagination.currentPage === page
                              ? "z-10 bg-primary text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              : "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}

                  <button
                    onClick={() =>
                      pagination.hasNextPage &&
                      handlePageChange(pagination.currentPage + 1)
                    }
                    disabled={!pagination.hasNextPage}
                    className={`relative inline-flex items-center rounded-r-md px-2 py-2 ${
                      pagination.hasNextPage
                        ? "text-gray-400 hover:bg-gray-50 focus:z-20 focus:outline-offset-0"
                        : "text-gray-300 bg-gray-50"
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
