import {cn} from "@/app/lib/utils/cn";
import {ReactNode} from "react";

export function Container({children, className}: { children: ReactNode; className?: string }) {
    return <div className={cn("mx-auto w-full max-w-[560px] px-6", className)}>{children}</div>;
}