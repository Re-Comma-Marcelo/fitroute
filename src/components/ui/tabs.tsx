import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
 React.ElementRef<typeof TabsPrimitive.List>,
 React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
 <TabsPrimitive.List
 ref={ref}
 className={cn(
 "inline-flex min-h-11 items-center justify-start rounded-none border-b-[3px] border-stone-line bg-transparent p-0 text-muted-foreground",
 className,
 )}
 {...props}
 />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
 React.ElementRef<typeof TabsPrimitive.Trigger>,
 React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
 <TabsPrimitive.Trigger
 ref={ref}
 className={cn(
 "inline-flex min-h-11 items-center justify-center whitespace-nowrap border-b-[6px] border-transparent px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.18em] cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-violet data-[state=active]:text-violet",
 className,
 )}
 {...props}
 />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
 React.ElementRef<typeof TabsPrimitive.Content>,
 React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
 <TabsPrimitive.Content
 ref={ref}
 className={cn(
 "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
 className,
 )}
 {...props}
 />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
