import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, DollarSign, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";
import { formatCurrency } from "@/lib/currency";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category_id: string;
  transaction_date: string;
  payment_method: string;
  categories: { name: string; color: string } | null;
}

const Expenses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    fetchTransactions();
    fetchUserCurrency();

    // Real-time updates for transactions
    const channel = supabase
      .channel('expenses-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          fetchTransactions();
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

  const fetchTransactions = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        categories (name, color)
      `)
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    } else {
      toast({ title: "Transaction deleted" });
      fetchTransactions();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 pb-20 md:pb-8">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Expenses</h1>
          <Button onClick={() => navigate("/")}>Dashboard</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Transaction History</h2>
          <Button onClick={() => navigate("/add-expense")}>
            <Plus className="mr-2 h-4 w-4" /> Add Expense
          </Button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : transactions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No transactions yet</p>
            <Button onClick={() => navigate("/add-expense")}>
              Add Your First Expense
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {transactions.map((transaction) => (
              <Card key={transaction.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {transaction.description || "Untitled"}
                        </h3>
                        {transaction.categories && (
                          <Badge
                            style={{
                              backgroundColor: transaction.categories.color || "#666",
                            }}
                          >
                            {transaction.categories.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(transaction.transaction_date), "MMM d, yyyy")}
                        </span>
                        {transaction.payment_method && (
                          <span>{transaction.payment_method}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(Number(transaction.amount), currency)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTransaction(transaction.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Expenses;
