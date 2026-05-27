"use client";

const TONE_STYLES = {
  neutral: "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  primary: "border-blue-200 bg-blue-50 text-[#1e3a8a] hover:bg-blue-100",
  purple: "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  danger: "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
  warning: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  active: "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100",
};

export default function TableActionButton({
  children,
  className = "",
  disabled = false,
  iconOnly = false,
  onClick,
  title,
  tone = "neutral",
  type = "button",
  ...props
}) {
  const toneClass = TONE_STYLES[tone] || TONE_STYLES.neutral;
  const sizeClass = iconOnly
    ? "h-9 w-9 justify-center px-0"
    : "min-h-9 px-3 py-1.5 text-sm";

  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      {...props}
      className={[
        "inline-flex items-center gap-1.5 rounded-lg border font-medium transition-colors",
        sizeClass,
        toneClass,
        disabled ? "cursor-not-allowed opacity-50" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
