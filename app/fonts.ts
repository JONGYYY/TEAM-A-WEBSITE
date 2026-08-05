import { Poppins } from "next/font/google";

// Site-wide typeface. Poppins doesn't have a variable axis, so load the weights
// the design uses (light → extra-bold). Exposed as --font-poppins and mapped to
// every role (display / ui / mono) in globals.css.
export const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});
