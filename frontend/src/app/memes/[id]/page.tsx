"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import api from "@/utils/api";
import { useRouter } from "next/navigation";

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
  originalImageUrl?: string;
  topText?: string;
  bottomText?: string;
  textColor?: string;
  fontSize?: number;
  creator: Creator;
  createdAt: string;
  votes: number;
  views: number;
  commentCount: number;
}

interface Comment {
  _id: string;
  text: string;
  creator: Creator;
  createdAt: string;
  flagged: boolean;
  flagCount: number;
}

export default function MemeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [meme, setMeme] = useState<Meme | null>(null);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [vote, setVote] = useState<number | null>(null);
  const [voteCount, setVoteCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [flaggedComments, setFlaggedComments] = useState<Set<string>>(
    new Set()
  );
  const [flaggingComment, setFlaggingComment] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);

    fetchMemeDetails(!!token);
    fetchComments();
  }, [params.id]);

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

  const fetchMemeDetails = async (isAuth: boolean) => {
    try {
      setIsLoading(true);
      setError("");
      setImageError(false);

      const response = await api.get(`/memes/${params.id}`);
      setMeme(response.data);
      setVoteCount(response.data.votes);

      // Check if user has already voted on this meme (only if authenticated)
      if (isAuth) {
        try {
          const voteResponse = await api.get(`/votes/${params.id}`);
          if (voteResponse.data && voteResponse.data.value) {
            setVote(voteResponse.data.value);
          }
        } catch (err) {
          // If no vote exists, that's fine
          console.log("No existing vote found");
        }
      }
    } catch (err: any) {
      console.error("Error fetching meme:", err);
      setError(err.response?.data?.message || "Failed to load meme");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await api.get(`/comments/${params.id}`);

      // Initialize flagged comments set from server data
      const newFlaggedComments = new Set<string>();

      // Add comments flagged by the current user
      if (
        response.data.userFlaggedComments &&
        Array.isArray(response.data.userFlaggedComments)
      ) {
        response.data.userFlaggedComments.forEach((commentId: string) => {
          newFlaggedComments.add(commentId);
        });
      }

      setFlaggedComments(newFlaggedComments);
      setComments(response.data.comments || []);
    } catch (err: any) {
      console.error("Error fetching comments:", err);
    }
  };

  const handleVote = async (value: number) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push(`/auth/signin?redirect=/memes/${params.id}`);
      return;
    }

    // If user already voted with this value, don't allow another vote
    if (vote === value) {
      return; // User already voted with this value, so we don't allow another vote
    }

    // Prevent multiple vote requests at once
    if (isVoting) {
      return;
    }

    try {
      setIsVoting(true);

      if (vote !== null) {
        // User is changing their vote
        await api.post(`/votes/${params.id}`, {
          value: value,
        });

        setVoteCount((prevCount) => prevCount + value - vote);
        setVote(value);
      } else {
        // User is voting for the first time
        await api.post(`/votes/${params.id}`, {
          value: value,
        });

        setVoteCount((prevCount) => prevCount + value);
        setVote(value);
      }
    } catch (err: any) {
      console.error("Error voting:", err);
      alert(err.response?.data?.message || "Failed to vote");
    } finally {
      setIsVoting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push(`/auth/signin?redirect=/memes/${params.id}`);
      return;
    }

    if (commentText.trim()) {
      try {
        const response = await api.post(`/comments/${params.id}`, {
          text: commentText,
        });

        // Add the new comment to the list
        setComments([response.data, ...comments]);
        setCommentText("");

        // Update comment count in the meme
        if (meme) {
          setMeme({
            ...meme,
            commentCount: meme.commentCount + 1,
          });
        }
      } catch (err: any) {
        console.error("Error adding comment:", err);
        alert(err.response?.data?.message || "Failed to add comment");
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleImageError = () => {
    // If image fails to load and we have an original image URL, use that instead
    if (meme?.originalImageUrl && !imageError) {
      setImageError(true);
      console.log("Using original image URL as fallback");
    }
  };

  // Handle flagging a comment
  const handleFlagComment = async (commentId: string) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push(`/auth/signin?redirect=/memes/${params.id}`);
      return;
    }

    // Prevent multiple flags from the same user
    if (flaggedComments.has(commentId)) {
      alert("You have already flagged this comment");
      return;
    }

    try {
      setFlaggingComment(commentId);

      await api.post(`/comments/${commentId}/flag`);

      // Add to local flagged set to prevent multiple flags
      setFlaggedComments((prev) => new Set([...prev, commentId]));

      // Update the comment in the local state
      setComments((prevComments) =>
        prevComments.map((comment) => {
          if (comment._id === commentId) {
            const newFlagCount = (comment.flagCount || 0) + 1;
            return {
              ...comment,
              flagCount: newFlagCount,
              flagged: newFlagCount >= 3 || comment.flagged,
            };
          }
          return comment;
        })
      );

      // Show a brief message
      alert("Comment has been flagged for review");
    } catch (err: any) {
      console.error("Error flagging comment:", err);

      // If the error is because the user already flagged this comment,
      // update the local state to reflect that
      if (
        err.response?.status === 400 &&
        err.response?.data?.message?.includes("already flagged")
      ) {
        setFlaggedComments((prev) => new Set([...prev, commentId]));
        alert("You have already flagged this comment");
      } else {
        alert(err.response?.data?.message || "Failed to flag comment");
      }
    } finally {
      setFlaggingComment(null);
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
          <Link href="/memes" className="text-primary hover:text-primary/90">
            ← Back to memes
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Meme Image */}
        <div className="lg:col-span-2">
          <div className="card">
            <h1 className="text-2xl font-bold mb-4">{meme.title}</h1>

            <div className="relative w-full h-[500px]">
              <Image
                src={
                  imageError && meme.originalImageUrl
                    ? meme.originalImageUrl
                    : meme.imageUrl || ""
                }
                alt={meme.title || "Meme image"}
                fill
                className="object-contain"
                onError={handleImageError}
                priority
                unoptimized
              />
              {!imageError && meme.topText && (
                <div
                  className="absolute top-4 left-0 w-full text-center font-bold"
                  style={{
                    fontSize: `${meme.fontSize}px`,
                    color: meme.textColor,
                  }}
                >
                  {meme.topText}
                </div>
              )}
              {!imageError && meme.bottomText && (
                <div
                  className="absolute bottom-4 left-0 w-full text-center font-bold"
                  style={{
                    fontSize: `${meme.fontSize}px`,
                    color: meme.textColor,
                  }}
                >
                  {meme.bottomText}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="flex items-center">
                <div className="relative h-10 w-10 rounded-full overflow-hidden mr-3">
                  <Image
                    src={getImageUrl(meme.creator.image)}
                    alt={meme.creator.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  {meme.creator._id ? (
                    <Link
                      href={`/profile/${meme.creator._id}`}
                      className="font-medium hover:text-primary"
                    >
                      {meme.creator.name}
                    </Link>
                  ) : (
                    <span className="font-medium">{meme.creator.name}</span>
                  )}
                  <p className="text-sm text-gray-500">
                    {formatDate(meme.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="mr-4">{meme.views} views</span>
                <span>{voteCount} votes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Voting and Comments */}
        <div className="lg:col-span-1">
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Vote</h2>
            <div className="flex justify-center items-center space-x-6">
              <button
                className={`flex flex-col items-center ${
                  vote === 1
                    ? "text-primary font-bold"
                    : "text-gray-500 hover:text-primary"
                }`}
                onClick={() => handleVote(1)}
                disabled={isVoting || vote === 1}
                title={
                  vote === 1
                    ? "You already upvoted this meme"
                    : "Upvote this meme"
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-10 w-10 ${isVoting || vote === 1 ? "opacity-50" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="mt-1">
                  {vote === 1 ? "Upvoted" : "Upvote"}
                </span>
              </button>
              <button
                className={`flex flex-col items-center ${
                  vote === -1
                    ? "text-red-500 font-bold"
                    : "text-gray-500 hover:text-red-500"
                }`}
                onClick={() => handleVote(-1)}
                disabled={isVoting || vote === -1}
                title={
                  vote === -1
                    ? "You already downvoted this meme"
                    : "Downvote this meme"
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-10 w-10 ${isVoting || vote === -1 ? "opacity-50" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="mt-1">
                  {vote === -1 ? "Downvoted" : "Downvote"}
                </span>
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">
              Comments ({comments.length})
            </h2>

            <form onSubmit={handleAddComment} className="mb-6">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Add a comment (max 140 characters)"
                maxLength={140}
                rows={3}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-500">
                  {commentText.length}/140
                </span>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!commentText.trim()}
                >
                  Comment
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment._id}
                  className={`border-b border-gray-100 pb-4 ${
                    comment.flagged ? "bg-red-50 p-3 rounded-md" : ""
                  }`}
                >
                  {comment.flagged && (
                    <div className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-md mb-2">
                      This comment has been flagged as inappropriate
                    </div>
                  )}
                  <div className="flex items-start">
                    <div className="relative h-8 w-8 rounded-full overflow-hidden mr-3">
                      <Image
                        src={getImageUrl(comment.creator.image)}
                        alt={comment.creator.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between">
                        <div>
                          {comment.creator._id ? (
                            <Link
                              href={`/profile/${comment.creator._id}`}
                              className="font-medium hover:text-primary mr-2"
                            >
                              {comment.creator.name}
                            </Link>
                          ) : (
                            <span className="font-medium mr-2">
                              {comment.creator.name}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        {isAuthenticated && (
                          <button
                            onClick={() => handleFlagComment(comment._id)}
                            disabled={
                              flaggingComment === comment._id ||
                              flaggedComments.has(comment._id)
                            }
                            className={`text-xs px-2 py-1 rounded ${
                              flaggedComments.has(comment._id)
                                ? "bg-gray-100 text-gray-500"
                                : "bg-red-50 text-red-500 hover:bg-red-100"
                            }`}
                            title={
                              flaggedComments.has(comment._id)
                                ? "You've already flagged this comment"
                                : "Flag inappropriate content"
                            }
                          >
                            {flaggingComment === comment._id ? (
                              <span>Flagging...</span>
                            ) : flaggedComments.has(comment._id) ? (
                              <span>Flagged</span>
                            ) : (
                              <span>
                                Flag
                                {comment.flagCount > 0
                                  ? ` (${comment.flagCount})`
                                  : ""}
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                      <p className="mt-1">{comment.text}</p>
                    </div>
                  </div>
                </div>
              ))}

              {comments.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No comments yet. Be the first to comment!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
