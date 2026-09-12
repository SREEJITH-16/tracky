import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { AddBudgetDialog } from "@/components/AddBudgetDialog";
import { BudgetSavingsLink } from "@/components/BudgetSavingsLink";
import { formatCurrency } from "@/lib/currency";

interface Budget {
  id: string;
  amount: number;
  period: string;
  categories: { name: string; color: string } | null;
}

const Budget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spending, setSpending] = useState<Record<string, number>>({});
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    fetchBudgets();
    fetchSpending();
    fetchUserCurrency();

    // Real-time updates for budgets and transactions
    const budgetsChannel = supabase
      .channel('budgets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budgets',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchBudgets();
        }
      )
      .subscribe();

    const transactionsChannel = supabase
      .channel('budget-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchSpending();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(budgetsChannel);
      supabase.removeChannel(transactionsChannel);
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

  const fetchBudgets = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("budgets")
      .select(`*, categories (name, color)`)
      .eq("user_id", user.id);

    if (!error && data) {
      setBudgets(data);
    }
  };

  const fetchSpending = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("transactions")
      .select("category_id, amount")
      .eq("user_id", user.id);

    if (!error && data) {
      const totals: Record<string, number> = {};
      data.forEach((t) => {
        if (t.category_id) {
          totals[t.category_id] = (totals[t.category_id] || 0) + Number(t.amount);
        }
      });
      setSpending(totals);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 pb-20 md:pb-8">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Budget</h1>
          <div className="flex gap-2">
            <AddBudgetDialog onSuccess={fetchBudgets} />
            <Button variant="outline" onClick={() => navigate("/")}>Dashboard</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <h2 className="text-3xl font-bold mb-6">Budget Overview</h2>

        <BudgetSavingsLink />

        {budgets.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No budgets set yet</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {budgets.map((budget) => {
              const spent = budget.categories ? spending[budget.categories.name] || 0 : 0;
              const percentage = (spent / Number(budget.amount)) * 100;

              return (
                <Card key={budget.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between">
                      <span>{budget.categories?.name || "General"}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {budget.period}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Spent: {formatCurrency(spent, currency)}</span>
                        <span>Budget: {formatCurrency(Number(budget.amount), currency)}</span>
                      </div>
                      <Progress value={Math.min(percentage, 100)} />
                      <p className="text-xs text-muted-foreground text-right">
                        {percentage.toFixed(0)}% used
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Budget;
