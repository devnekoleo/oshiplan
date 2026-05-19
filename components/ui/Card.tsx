import { cn } from "@/lib/utils";

interface CardProps {
  className?: string;
  children: import("react").ReactNode;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ className, children, onClick, hover }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-100 bg-white p-4 shadow-sm",
        hover && "cursor-pointer transition hover:border-purple-200 hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
