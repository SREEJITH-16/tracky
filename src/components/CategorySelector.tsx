import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface CategorySelectorProps {
  value: string;
  onChange: (categoryId: string) => void;
}

export const CategorySelector = ({ value, onChange }: CategorySelectorProps) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories();

    // Real-time updates for categories
    const channel = supabase
      .channel('category-selector')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchCategories = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id);

    if (!error && data) {
      setCategories(data);
    }
  };

  return (
    <div className="space-y-3">
      <Label>Category</Label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:scale-105",
              value === category.id
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border bg-card hover:border-primary/50"
            )}
            style={{
              borderColor: value === category.id ? category.color : undefined,
              backgroundColor: value === category.id ? category.color + "15" : undefined,
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2"
              style={{ backgroundColor: category.color + "30" }}
            >
              {category.icon}
            </div>
            <span className="text-xs font-medium text-center">{category.name}</span>
          </button>
        ))}
      </div>
      {categories.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No categories yet. Create one in Categories page.
        </p>
      )}
    </div>
  );
};
