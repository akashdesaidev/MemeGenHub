import NextAuth from "next-auth/next";
import { authConfig } from "@/lib/auth-config";

// Only export the handler functions without exporting authOptions
const handler = NextAuth(authConfig);
export { handler as GET, handler as POST };
