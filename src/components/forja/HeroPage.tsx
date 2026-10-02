import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { useScrollContainer } from "@/components/AppShell";

function cssNumber(name: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Full-bleed photo page (Home, Train). The photo is sticky at the top and the
 * content scrolls over it; while scrolling the photo blurs, darkens, fades and
 * scales up. Must be rendered inside <AppShell hero>.
 *
 * Layout: `top` sits at the top of the photo, `intro` is pushed to the bottom
 * of the photo area, then `children` (the cards) follow.
 */
export function HeroPage({
  image,
  top,
  intro,
  children,
}: {
  image: string;
  top: ReactNode;
  intro: ReactNode;
  children: ReactNode;
}) {
  const container = useScrollContainer();
  const [range, setRange] = useState(340);
  useEffect(() => setRange(cssNumber("--hero-scroll-range", 340)), []);

  const { scrollY } = useScroll(container ? { container } : undefined);
  const filter = useTransform(
    scrollY,
    [0, range],
    ["blur(0px) brightness(1)", "blur(16px) brightness(0.5)"],
  );
  const opacity = useTransform(scrollY, [0, range], [1, 0.35]);
  const scale = useTransform(scrollY, [0, range], [1, 1.08]);

  return (
    <div className="relative isolate min-h-full font-ui">
      <div aria-hidden className="grain" />

      {/* Sticky photo: zero layout height, so the content starts at the top. */}
      <div aria-hidden className="pointer-events-none sticky top-0 z-0 h-0">
        <div
          className="relative h-[var(--hero-h)] w-full overflow-hidden"
          style={{ maskImage: "var(--hero-photo-mask)", WebkitMaskImage: "var(--hero-photo-mask)" }}
        >
          {/* Scroll effect on a wrapper, so the cross-fade between photos keeps its own opacity. */}
          <motion.div
            className="absolute inset-0"
            style={{
              filter,
              WebkitFilter: filter,
              opacity,
              scale,
              willChange: "transform, filter, opacity",
            }}
          >
            <AnimatePresence initial={false}>
              <motion.img
                key={image}
                src={image}
                alt=""
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0 size-full object-cover"
              />
            </AnimatePresence>
          </motion.div>
          <div className="hero-overlay absolute inset-0" />
        </div>
      </div>

      {/* Recovery glow under the photo, bottom right. */}
      <div
        aria-hidden
        className="pointer-events-none absolute z-0 rounded-full bg-fj-recovery"
        style={{
          width: "var(--hero-glow-size)",
          height: "var(--hero-glow-size)",
          top: "calc(var(--hero-h) - var(--hero-glow-size) * 0.75)",
          right: "calc(var(--hero-glow-size) * -0.35)",
          filter: "blur(var(--hero-glow-blur))",
          opacity: "var(--hero-glow-opacity)",
        }}
      />

      <div className="relative z-[2] mx-auto max-w-md px-page-x pt-page-top">
        <div className="flex min-h-[calc(var(--hero-content-top)-var(--page-top))] flex-col">
          {top}
          <div className="mt-auto pb-block pt-6">{intro}</div>
        </div>
        <div className="flex flex-col gap-block">{children}</div>
      </div>
    </div>
  );
}
