import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import api from "@/utils/api";
import { useRouter } from "next/navigation";

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
}

interface MemeCardProps {
  meme: Meme;
}

export default function MemeCard({ meme }: MemeCardProps) {
  const {
    _id,
    title,
    imageUrl,
    originalImageUrl,
    creator,
    createdAt,
    commentCount,
  } = meme;
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const [originalImageError, setOriginalImageError] = useState(false);
  const [vote, setVote] = useState<number | null>(null);
  const [voteCount, setVoteCount] = useState(meme.votes);
  const [isVoting, setIsVoting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Format the date
  const formattedDate = new Date(createdAt).toLocaleDateString();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      const isAuth = !!token;
      setIsAuthenticated(isAuth);

      // If authenticated, fetch user's vote for this meme
      if (isAuth) {
        await fetchUserVote();
      }
    };

    checkAuth();
  }, [_id]);

  const fetchUserVote = async () => {
    try {
      const response = await api.get(`/votes/${_id}`);
      if (response.data && response.data.value !== undefined) {
        setVote(response.data.value);
      }
    } catch (err: any) {
      // 404 is expected if user hasn't voted yet
      if (err.response?.status !== 404) {
        console.error("Error fetching user vote:", err);
      }
    }
  };

  const handleVote = async (value: number) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push(`/auth/signin?redirect=/memes`);
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
        await api.post(`/votes/${_id}`, {
          value: value,
        });

        setVoteCount((prevCount) => prevCount + value - vote);
        setVote(value);
      } else {
        // User is voting for the first time
        await api.post(`/votes/${_id}`, {
          value: value,
        });

        setVoteCount((prevCount) => prevCount + value);
        setVote(value);
      }
    } catch (err: any) {
      console.error("Error voting:", err);
    } finally {
      setIsVoting(false);
    }
  };

  const handleImageError = () => {
    if (!imageError) {
      console.log(`Image failed to load: ${imageUrl}`);
      setImageError(true);
    }
  };

  const handleOriginalImageError = () => {
    if (!originalImageError) {
      console.log(`Original image failed to load: ${originalImageUrl}`);
      setOriginalImageError(true);
    }
  };

  // Determine which image URL to use
  const getImageUrl = () => {
    if (!imageError) {
      return imageUrl;
    } else if (originalImageUrl && !originalImageError) {
      return originalImageUrl;
    } else {
      // Fallback to a real placeholder when both images fail
      return "https://placehold.co/600x400/e0e0e0/969696?text=Image+Not+Available";
    }
  };

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <Link href={`/memes/${_id}`}>
        <div className="relative w-full aspect-[4/3] mb-3">
          {imageError && originalImageUrl ? (
            <Image
              src={originalImageUrl}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover rounded-t-lg"
              onError={handleOriginalImageError}
              priority
            />
          ) : (
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover rounded-t-lg"
              onError={handleImageError}
              priority
            />
          )}
          {imageError && originalImageError && (
            <Image
              src="https://placehold.co/600x400/e0e0e0/969696?text=Image+Not+Available"
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover rounded-t-lg"
              priority
            />
          )}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
      </Link>

      <div className="flex justify-between items-center text-sm text-gray-600">
        {creator._id ? (
          <Link href={`/profile/${creator._id}`} className="hover:text-primary">
            {creator.name}
          </Link>
        ) : (
          <span>{creator.name}</span>
        )}
        <span>{formattedDate}</span>
      </div>

      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <button
            className={`${
              vote === 1
                ? "text-primary font-bold"
                : "text-gray-500 hover:text-primary"
            } ${isVoting || vote === 1 ? "opacity-50" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              handleVote(1);
            }}
            disabled={isVoting || vote === 1}
            title={
              vote === 1 ? "You already upvoted this meme" : "Upvote this meme"
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <span>{voteCount}</span>
          <button
            className={`${
              vote === -1
                ? "text-red-500 font-bold"
                : "text-gray-500 hover:text-red-500"
            } ${isVoting || vote === -1 ? "opacity-50" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              handleVote(-1);
            }}
            disabled={isVoting || vote === -1}
            title={
              vote === -1
                ? "You already downvoted this meme"
                : "Downvote this meme"
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center space-x-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
              clipRule="evenodd"
            />
          </svg>
          <span>{commentCount}</span>
        </div>
      </div>
    </div>
  );
}
