import * as React from "react"

interface TabsContextType {
    value: string;
    onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

const useTabs = () => {
    const context = React.useContext(TabsContext);
    if (!context) {
        throw new Error("Tabs components must be used within Tabs");
    }
    return context;
};

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
    value: string;
    onValueChange: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
    ({ value, onValueChange, className = "", ...props }, ref) => (
        <TabsContext.Provider value={{ value, onValueChange }}>
            <div
                ref={ref}
                className={`w-full ${className}`}
                {...props}
            />
        </TabsContext.Provider>
    )
);
Tabs.displayName = "Tabs";

type TabsListProps = React.HTMLAttributes<HTMLDivElement>

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
    ({ className = "", ...props }, ref) => (
        <div
            ref={ref}
            className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}
            {...props}
        />
    )
);
TabsList.displayName = "TabsList";

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
    ({ value, className = "", ...props }, ref) => {
        const { value: selectedValue, onValueChange } = useTabs();
        const isActive = selectedValue === value;

        return (
            <button
                ref={ref}
                onClick={() => onValueChange(value)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                    isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                } ${className}`}
                {...props}
            />
        );
    }
);
TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
    value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
    ({ value, className = "", ...props }, ref) => {
        const { value: selectedValue } = useTabs();

        if (selectedValue !== value) {
            return null;
        }

        return (
            <div
                ref={ref}
                className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
                {...props}
            />
        );
    }
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };