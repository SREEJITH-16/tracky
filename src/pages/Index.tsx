import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/currency";
import { ArrowUpRight, Target, TrendingDown, Wallet, Plus, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category_id: string | null;
  transaction_date: string;
}

interface Budget {
  id: string;
  amount: number;
  category_id: string | null;
  period: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
}

interface Category {
  id: string;
  name: string;
  color: string | null;
}

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState("INR");
  const [spending, setSpending] = useState<Record<string, number>>({});
  const [totalSpending, setTotalSpending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAllData();
      
      // Real-time listeners
      const transactionsChannel = supabase
        .channel('transactions-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchAllData)
        .subscribe();
      
      const budgetsChannel = supabase
        .channel('budgets-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, fetchAllData)
        .subscribe();
      
      const savingsChannel = supabase
        .channel('savings-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_goals' }, fetchAllData)
        .subscribe();

      return () => {
        supabase.removeChannel(transactionsChannel);
        supabase.removeChannel(budgetsChannel);
        supabase.removeChannel(savingsChannel);
      };
    }
  }, [user]);

  const fetchAllData = async () => {
    if (!user) return;
    
    setLoading(true);
    await Promise.all([
      fetchUserCurrency(),
      fetchTransactions(),
      fetchBudgets(),
      fetchSavingsGoals(),
      fetchCategories(),
    ]);
    setLoading(false);
  };

  const fetchUserCurrency = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("currency")
      .eq("id", user!.id)
      .single();
    if (data) setCurrency(data.currency || "INR");
  };

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user!.id)
      .order("transaction_date", { ascending: false })
      .limit(5);
    
    if (data) {
      setTransactions(data);
      const total = data.reduce((sum, t) => sum + Number(t.amount), 0);
      setTotalSpending(total);
      
      // Calculate spending by category
      const spendingByCategory: Record<string, number> = {};
      data.forEach(t => {
        const catId = t.category_id || "uncategorized";
        spendingByCategory[catId] = (spendingByCategory[catId] || 0) + Number(t.amount);
      });
      setSpending(spendingByCategory);
    }
  };

  const fetchBudgets = async () => {
    const { data } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user!.id);
    if (data) setBudgets(data);
  };

  const fetchSavingsGoals = async () => {
    const { data } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user!.id)
      .limit(3);
    if (data) setSavingsGoals(data);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user!.id);
    if (data) setCategories(data);
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized";
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Unknown";
  };

  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const budgetUsagePercent = totalBudget > 0 ? (totalSpending / totalBudget) * 100 : 0;

  return (
    <div 
      className="min-h-screen pb-20 md:pb-8 bg-cover bg-center bg-fixed relative"
      style={{ backgroundImage: 'url(/hero-bg.jpg)' }}
    >
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
      <div className="relative z-10">
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">Tracky</h1>
            <Button variant="outline" onClick={() => navigate('/settings')}>Settings</Button>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-8 space-y-6">
          {/* Welcome Section */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}!</h2>
            <p className="text-muted-foreground">Here's your financial overview</p>
          </Card>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Spending</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalSpending, currency)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-destructive" />
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Budget Used</p>
                  <p className="text-2xl font-bold">{budgetUsagePercent.toFixed(0)}%</p>
                </div>
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <Progress value={budgetUsagePercent} className="mt-2" />
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Goals</p>
                  <p className="text-2xl font-bold">{savingsGoals.length}</p>
                </div>
                <Target className="h-8 w-8 text-accent" />
              </div>
            </Card>
          </div>

          {/* Budgets & Savings */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Budget Overview</h3>
                <Button size="sm" variant="ghost" onClick={() => navigate('/budget')}>
                  View All
                </Button>
              </div>
              {budgets.length === 0 ? (
                <p className="text-muted-foreground text-sm">No budgets set yet</p>
              ) : (
                <div className="space-y-3">
                  {budgets.slice(0, 3).map(budget => {
                    const spent = spending[budget.category_id || "uncategorized"] || 0;
                    const percent = (spent / Number(budget.amount)) * 100;
                    return (
                      <div key={budget.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{getCategoryName(budget.category_id)}</span>
                          <span className="text-muted-foreground">
                            {formatCurrency(spent, currency)} / {formatCurrency(Number(budget.amount), currency)}
                          </span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Savings Goals</h3>
                <Button size="sm" variant="ghost" onClick={() => navigate('/savings')}>
                  View All
                </Button>
              </div>
              {savingsGoals.length === 0 ? (
                <p className="text-muted-foreground text-sm">No savings goals yet</p>
              ) : (
                <div className="space-y-3">
                  {savingsGoals.map(goal => {
                    const percent = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
                    return (
                      <div key={goal.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{goal.name}</span>
                          <span className="text-muted-foreground">
                            {formatCurrency(Number(goal.current_amount), currency)} / {formatCurrency(Number(goal.target_amount), currency)}
                          </span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Recent Transactions</h3>
              <Button size="sm" variant="ghost" onClick={() => navigate('/expenses')}>
                View All
              </Button>
            </div>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactions.map(transaction => (
                  <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">{transaction.description || "Expense"}</p>
                      <p className="text-xs text-muted-foreground">
                        {getCategoryName(transaction.category_id)} • {new Date(transaction.transaction_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="font-semibold text-destructive">
                      -{formatCurrency(Number(transaction.amount), currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-4">
            <Button variant="outline" className="h-20" onClick={() => navigate('/add-expense')}>
              <div className="flex flex-col items-center gap-1">
                <Plus className="h-5 w-5" />
                <span className="text-sm">Add Expense</span>
              </div>
            </Button>
            <Button variant="outline" className="h-20" onClick={() => navigate('/budget')}>
              <div className="flex flex-col items-center gap-1">
                <Wallet className="h-5 w-5" />
                <span className="text-sm">Set Budget</span>
              </div>
            </Button>
            <Button variant="outline" className="h-20" onClick={() => navigate('/savings')}>
              <div className="flex flex-col items-center gap-1">
                <Target className="h-5 w-5" />
                <span className="text-sm">Savings Goal</span>
              </div>
            </Button>
            <Button variant="outline" className="h-20" onClick={() => navigate('/categories')}>
              <div className="flex flex-col items-center gap-1">
                <Tag className="h-5 w-5" />
                <span className="text-sm">Categories</span>
              </div>
            </Button>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
};

export default Index;
