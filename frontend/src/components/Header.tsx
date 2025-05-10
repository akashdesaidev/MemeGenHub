"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [userName, setUserName] = useState("");
  const [userImage, setUserImage] = useState("/images/default-avatar.svg");
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Check authentication status whenever component mounts or path changes
  const checkAuthStatus = useCallback(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (token) {
      try {
        // Parse token to get user info
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));

          // Check if token is expired
          if (payload.exp * 1000 < Date.now()) {
            console.log("Token expired, logging out");
            localStorage.removeItem("token");
            setIsLoggedIn(false);
            return;
          }

          setIsLoggedIn(true);

          // Set user name if available
          if (payload.name) {
            setUserName(payload.name);
          }

          // Fetch user profile immediately when token is valid
          fetchUserProfile();
        } else {
          // Invalid token format
          localStorage.removeItem("token");
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Error parsing token:", error);
        localStorage.removeItem("token");
        setIsLoggedIn(false);
      }
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  // Run checkAuthStatus when component mounts and when path changes
  useEffect(() => {
    checkAuthStatus();
  }, [pathname, checkAuthStatus]);

  // Add event listener for storage changes to detect login/logout in other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "token") {
        checkAuthStatus();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [checkAuthStatus]);

  // Add event listener for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log("Profile update event received, fetching new profile data");
      fetchUserProfile();
    };

    window.addEventListener("profile-updated", handleProfileUpdate);
    window.addEventListener("user-login", handleProfileUpdate);

    // Fetch profile on component mount
    if (localStorage.getItem("token")) {
      fetchUserProfile();
    }

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
      window.removeEventListener("user-login", handleProfileUpdate);
    };
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }

      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(".mobile-menu-button")
      ) {
        setShowMobileMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close mobile menu when navigating
  useEffect(() => {
    setShowMobileMenu(false);
  }, [pathname]);

  // Function to get the full image URL
  const getImageUrl = (imagePath: string | undefined) => {
    if (!imagePath) return "/images/default-avatar.svg";

    // If the image is empty string, use default avatar
    if (imagePath === "") return "/images/default-avatar.svg";

    // Cloudinary URLs already include http, so just return them
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

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("http://localhost:5000/api/auth/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        // Add cache busting parameter to prevent caching
        cache: "no-store",
      });

      if (response.ok) {
        const userData = await response.json();
        console.log("Profile data received:", userData);

        // Update user name if available
        if (userData.name) {
          setUserName(userData.name);
        }

        // Update user image if available
        if (userData.image) {
          const imageUrl = getImageUrl(userData.image);
          console.log("Setting user image to:", imageUrl);
          setUserImage(imageUrl);
        } else {
          // Set default avatar if image is not available
          setUserImage("/images/default-avatar.svg");
        }
      } else if (response.status === 401) {
        // Unauthorized - token is invalid or expired
        localStorage.removeItem("token");
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");

    // Trigger a custom event to notify other components about logout
    const logoutEvent = new Event("user-logout");
    window.dispatchEvent(logoutEvent);

    setIsLoggedIn(false);
    setShowProfileMenu(false);
    setShowMobileMenu(false);
    router.push("/");
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              MemeGenHub
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              className="mobile-menu-button p-2 rounded-md text-gray-700 hover:text-primary focus:outline-none"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {showMobileMenu ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-4">
            <Link href="/memes" className="text-gray-700 hover:text-primary">
              Browse
            </Link>
            {isLoggedIn ? (
              <>
                <Link
                  href="/memes/create"
                  className="text-gray-700 hover:text-primary"
                >
                  Create
                </Link>
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-primary"
                >
                  Dashboard
                </Link>

                {/* Profile dropdown */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center focus:outline-none"
                  >
                    <div className="relative h-8 w-8 rounded-full overflow-hidden">
                      <Image
                        src={userImage}
                        alt="Profile"
                        fill
                        className="object-cover"
                        unoptimized
                        onError={(e) => {
                          console.log("Image error, using default");
                          const target = e.target as HTMLImageElement;
                          target.src = "/images/default-avatar.svg";
                        }}
                      />
                    </div>
                    <span className="ml-2">{userName || "User"}</span>
                    <svg
                      className="ml-1 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        View Profile
                      </Link>
                      <Link
                        href="/profile/edit"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        Edit Profile
                      </Link>
                      <Link
                        href="/profile/change-password"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        Change Password
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link href="/auth/signin" className="btn btn-primary">
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      {showMobileMenu && (
        <div className="md:hidden" ref={mobileMenuRef}>
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white shadow-lg rounded-b-md">
            <Link
              href="/memes"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md"
            >
              Browse
            </Link>

            {isLoggedIn ? (
              <>
                <Link
                  href="/memes/create"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md"
                >
                  Create
                </Link>
                <Link
                  href="/dashboard"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md"
                >
                  <div className="relative h-6 w-6 rounded-full overflow-hidden mr-2">
                    <Image
                      src={userImage}
                      alt="Profile"
                      fill
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        console.log("Mobile menu image error, using default");
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/default-avatar.svg";
                      }}
                    />
                  </div>
                  <span>{userName || "Profile"}</span>
                </Link>
                <Link
                  href="/profile/edit"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md"
                >
                  Edit Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="block px-3 py-2 text-base font-medium text-white bg-primary hover:bg-primary/90 rounded-md"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
