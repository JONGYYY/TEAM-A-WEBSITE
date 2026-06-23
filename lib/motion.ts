import type { Variants, Transition } from "framer-motion";

export const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const spring: Transition = { type: "spring", stiffness: 220, damping: 26, mass: 1 };

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

export const fadeItem: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.5, ease: easeOut } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.55, ease: easeOut } },
};

/** step transition for the profile builder */
export const stepVariants: Variants = {
  enter: { opacity: 0, x: 28 },
  center: { opacity: 1, x: 0, transition: { duration: 0.42, ease: easeOut } },
  exit: { opacity: 0, x: -28, transition: { duration: 0.28, ease: easeOut } },
};
