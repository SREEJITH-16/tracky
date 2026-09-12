import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";
import { AddSavingsGoalDialog } from "@/components/AddSavingsGoalDialog";
import { formatCurrency } from "@/lib/currency";
import { Edit } from "lucide-react";

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  is_completed: boolean;
}

const Savings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [currency, setCurrency] = useState("INR");
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  useEffect(() => {
    fetchGoals();
    fetchUserCurrency();

    // Real-time updates for savings goals
    const channel = supabase
      .channel('savings-goals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'savings_goals',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchGoals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUserCurrency = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("currency")
      .eq("id", user.id)
      .maybeSingle();
    if (data) setCurrency(data.currency || "INR");
  };

  const fetchGoals = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setGoals(data);
    }
  };

  return (
    <div 
      className="min-h-screen pb-20 md:pb-8 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: 'url(/savings-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" />
      <div className="relative z-10">
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">Savings Goals</h1>
            <div className="flex gap-2">
              <AddSavingsGoalDialog onSuccess={fetchGoals} />
              <Button variant="outline" onClick={() => navigate("/")}>Dashboard</Button>
            </div>
          </div>
        </header>

        {editingGoal && (
          <AddSavingsGoalDialog goal={editingGoal} onSuccess={() => { fetchGoals(); setEditingGoal(null); }} />
        )}

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">Your Savings Goals</h2>

        {goals.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No savings goals yet</p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {goals.map((goal) => {
              const percentage = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;

              return (
                <Card key={goal.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{goal.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingGoal(goal)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Current: {formatCurrency(Number(goal.current_amount), currency)}</span>
                        <span>Target: {formatCurrency(Number(goal.target_amount), currency)}</span>
                      </div>
                      <Progress value={Math.min(percentage, 100)} />
                      <p className="text-xs text-muted-foreground mt-1">
                        {percentage.toFixed(0)}% complete
                      </p>
                    </div>
                    {goal.target_date && (
                      <p className="text-sm text-muted-foreground">
                        Target Date: {format(new Date(goal.target_date), "MMM d, yyyy")}
                      </p>
                    )}
                    {goal.is_completed && (
                      <p className="text-sm font-semibold text-green-600">🎉 Goal Completed!</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default Savings;
