import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, PiggyBank, TrendingUp } from "lucide-react";

interface BudgetSurplus {
  totalBudget: number;
  totalSpent: number;
  surplus: number;
}

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
}

export const BudgetSavingsLink = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [budgetSurplus, setBudgetSurplus] = useState<BudgetSurplus | null>(null);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [currency, setCurrency] = useState("INR");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch currency
    const { data: profile } = await supabase
      .from("profiles")
      .select("currency")
      .eq("id", user.id)
      .single();
    if (profile) setCurrency(profile.currency || "INR");

    // Fetch budgets and spending
    const { data: budgets } = await supabase
      .from("budgets")
      .select("amount")
      .eq("user_id", user.id);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id);

    if (budgets && transactions) {
      const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
      const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const surplus = Math.max(0, totalBudget - totalSpent);

      setBudgetSurplus({ totalBudget, totalSpent, surplus });
    }

    // Fetch savings goals
    const { data: goals } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_completed", false);

    if (goals) setSavingsGoals(goals);
  };

  const allocateSurplus = async () => {
    if (!selectedGoalId || !budgetSurplus || budgetSurplus.surplus <= 0) return;

    setLoading(true);
    try {
      const selectedGoal = savingsGoals.find(g => g.id === selectedGoalId);
      if (!selectedGoal) throw new Error("Goal not found");

      const newAmount = Number(selectedGoal.current_amount) + budgetSurplus.surplus;

      const { error } = await supabase
        .from("savings_goals")
        .update({ current_amount: newAmount })
        .eq("id", selectedGoalId);

      if (error) throw error;

      toast({
        title: "🎉 Surplus Allocated!",
        description: `${formatCurrency(budgetSurplus.surplus, currency)} added to ${selectedGoal.name}`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!budgetSurplus || budgetSurplus.surplus <= 0) {
    return null;
  }

  const surplusPercent = (budgetSurplus.surplus / budgetSurplus.totalBudget) * 100;

  return (
    <Card className="p-6 bg-gradient-to-br from-success/10 to-accent/5 border-success/30 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-success/10 rounded-full">
          <PiggyBank className="h-6 w-6 text-success" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Budget Surplus Available!</h3>
          <p className="text-sm text-muted-foreground">You're under budget - allocate savings now</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Spent vs Budget</span>
            <span className="font-semibold text-success">
              {formatCurrency(budgetSurplus.surplus, currency)} left
            </span>
          </div>
          <Progress value={(budgetSurplus.totalSpent / budgetSurplus.totalBudget) * 100} className="h-2" />
        </div>

        <div className="p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground mb-2">Available to save</p>
          <p className="text-3xl font-bold text-success">{formatCurrency(budgetSurplus.surplus, currency)}</p>
        </div>

        {savingsGoals.length > 0 && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Allocate to Savings Goal</label>
            <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a savings goal" />
              </SelectTrigger>
              <SelectContent>
                {savingsGoals.map(goal => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.name} ({formatCurrency(Number(goal.current_amount), currency)} / {formatCurrency(Number(goal.target_amount), currency)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={allocateSurplus}
              disabled={!selectedGoalId || loading}
              className="w-full bg-gradient-to-r from-success to-accent hover:opacity-90"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              {loading ? "Allocating..." : "Allocate Surplus"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {savingsGoals.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Create a savings goal to allocate your surplus
          </p>
        )}
      </div>
    </Card>
  );
};