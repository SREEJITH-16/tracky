import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Palette, Tag } from "lucide-react";
import BottomNav from "@/components/BottomNav";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

const emojiIcons = ["🍔", "🚗", "🏠", "💡", "🎮", "👔", "💊", "✈️", "🎬", "📚", "🛒", "🎁"];

const Categories = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState({ name: "", color: "#8b5cf6", icon: "📁" });

  useEffect(() => {
    fetchCategories();

    const channel = supabase
      .channel('categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${user?.id}` }, () => fetchCategories())
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

  const addCategory = async () => {
    if (!user || !newCategory.name) return;

    const { error } = await supabase.from("categories").insert({
      user_id: user.id,
      name: newCategory.name,
      color: newCategory.color,
      icon: newCategory.icon,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    } else {
      toast({ title: "✨ Category added!", description: `${newCategory.icon} ${newCategory.name} created successfully` });
      setNewCategory({ name: "", color: "#8b5cf6", icon: "📁" });
      fetchCategories();
    }
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    } else {
      toast({ title: "Category deleted" });
      fetchCategories();
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Categories
            </h1>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>Dashboard</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Add Category Card */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Category
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Category Name
                  </Label>
                  <Input
                    id="name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="e.g., Groceries"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="color" className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Color
                  </Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      id="color"
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                      className="h-10 w-20"
                    />
                    <Input
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                      placeholder="#8b5cf6"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-2">Select Icon</Label>
                <div className="grid grid-cols-6 gap-2">
                  {emojiIcons.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewCategory({ ...newCategory, icon: emoji })}
                      className={`p-3 text-2xl rounded-lg border-2 transition-all hover:scale-110 ${
                        newCategory.icon === emoji 
                          ? "border-primary bg-primary/10 shadow-md" 
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={addCategory} 
                disabled={!newCategory.name}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Categories List */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <div className="h-1 w-8 bg-gradient-to-r from-primary to-accent rounded-full" />
            Your Categories ({categories.length})
          </h2>
          
          {categories.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No categories yet. Create your first category above!</p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((category) => (
                <Card 
                  key={category.id} 
                  className="hover:shadow-lg hover:scale-105 transition-all duration-200"
                  style={{ borderColor: category.color + "40" }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-md"
                          style={{ 
                            backgroundColor: category.color + "20",
                            border: `2px solid ${category.color}40`
                          }}
                        >
                          {category.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-lg truncate">{category.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div 
                              className="w-4 h-4 rounded-full border" 
                              style={{ backgroundColor: category.color }}
                            />
                            <p className="text-sm text-muted-foreground font-mono">
                              {category.color}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCategory(category.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default Categories;