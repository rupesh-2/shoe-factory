import Link from "next/link";
import type { ReactNode } from "react";
import { SubmitButton } from "./SubmitButton";
import { Icon } from "./icons";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-600 mt-1 max-w-3xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "green" | "amber" | "red" | "blue";
}) {
  const toneMap: Record<string, string> = {
    default: "text-slate-900",
    green: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-red-600",
    blue: "text-primary",
  };
  return (
    <Card className="p-4 sm:p-5 min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
        {label}
      </p>
      <p
        className={`mt-2 text-lg sm:text-2xl font-semibold tabular-nums break-words ${toneMap[tone]}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

const badgeStyles: Record<string, string> = {
  gray: "bg-slate-100 text-slate-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-800",
  purple: "bg-purple-100 text-purple-700",
};

export function Badge({
  children,
  color = "gray",
}: {
  children: ReactNode;
  color?: keyof typeof badgeStyles;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeStyles[color]}`}
    >
      {children}
    </span>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums [&_tbody_tr:last-child>td]:border-b-0 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-slate-50/70">
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={`text-left text-xs font-medium uppercase tracking-wide text-slate-600 whitespace-nowrap bg-slate-50/60 px-3 sm:px-4 py-3 border-b border-slate-200 ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <td className={`px-3 sm:px-4 py-3 border-b border-slate-100 ${className}`}>
      {children}
    </td>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center text-sm text-slate-500 py-10">{message}</div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 min-h-11 sm:min-h-9 text-sm font-medium transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed";

const buttonVariants: Record<string, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover shadow-sm",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({
  children,
  type = "submit",
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  type?: "submit" | "button";
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const cls = `${buttonBase} ${buttonVariants[variant]} ${className}`;
  if (type === "submit") return <SubmitButton className={cls}>{children}</SubmitButton>;
  return (
    <button type="button" className={cls}>
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  href,
  variant = "primary",
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link href={href} className={`${buttonBase} ${buttonVariants[variant]}`}>
      {children}
    </Link>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-lg border border-slate-300 px-3 min-h-11 sm:min-h-9 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors duration-200 hover:border-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:outline-none bg-white disabled:bg-slate-50 disabled:text-slate-500";

/** Full width unless the caller sets its own width (w-*), so `className="w-24"` actually applies. */
function fieldClass(extra?: string) {
  const hasWidth = /(^|\s)(\w+:)*w-/.test(extra ?? "");
  return `${inputClass} ${hasWidth ? "" : "w-full"} ${extra ?? ""}`;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={fieldClass(props.className)} />;
}

// Custom chevron so the arrow has breathing room instead of the browser's edge-hugging default
const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%2364748b' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        backgroundImage: chevron,
        backgroundRepeat: "no-repeat",
        backgroundSize: "1.1rem",
        backgroundPosition: "right 0.65rem center",
        ...props.style,
      }}
      className={`${fieldClass(props.className)} appearance-none truncate pr-9`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={fieldClass(props.className)} />;
}

export function AddDetails({
  summary,
  children,
}: {
  summary: string;
  children: ReactNode;
}) {
  return (
    <details className="group open:basis-full">
      <summary className={`${buttonBase} ${buttonVariants.primary} select-none list-none`}>
        <span className="group-open:hidden">+ {summary}</span>
        <span className="hidden group-open:inline">× Close</span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export function Alert({
  children,
  tone = "red",
}: {
  children: ReactNode;
  tone?: "red" | "green";
}) {
  const tones = {
    red: "bg-red-50 border-red-200 text-red-800",
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
  };
  return (
    <div role="alert" className={`mb-6 rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

/** GET search box; keeps other query params (e.g. a selected filter) as hidden inputs. */
export function SearchBar({
  placeholder,
  defaultValue,
  keep = {},
}: {
  placeholder: string;
  defaultValue?: string;
  keep?: Record<string, string | undefined>;
}) {
  return (
    <form role="search" className="relative w-full sm:w-72">
      {Object.entries(keep).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null
      )}
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${inputClass} w-full pl-9`}
      />
    </form>
  );
}

/** Pill-style filter links, e.g. order status. */
export function FilterTabs({
  tabs,
  active,
}: {
  tabs: { label: string; href: string; key?: string; count?: number }[];
  active?: string;
}) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Filter">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.label}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 min-h-9 text-sm transition-colors duration-200 ${
              on
                ? "bg-primary text-white"
                : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`text-xs ${on ? "text-blue-100" : "text-slate-500"}`}>{t.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
