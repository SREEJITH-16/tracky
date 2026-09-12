import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { formatCurrency } from "@/lib/currency";
import { Sparkles, TrendingUp, TrendingDown, DollarSign, Calendar, Loader2 } from "lucide-react";

interface CategorySpending {
  name: string;
  value: number;
  color: string;
}

interface MonthlySpending {
  month: string;
  amount: number;
}

const Analytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chartData, setChartData] = useState<CategorySpending[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlySpending[]>([]);
  const [totalSpending, setTotalSpending] = useState(0);
  const [monthlyAverage, setMonthlyAverage] = useState(0);
  const [topCategory, setTopCategory] = useState("");
  const [aiInsight, setAiInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    fetchAnalytics();
    fetchUserCurrency();
    
    const channel = supabase
      .channel('analytics-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user?.id}` }, () => fetchAnalytics())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUserCurrency = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("currency").eq("id", user.id).maybeSingle();
    if (data) setCurrency(data.currency || "INR");
  };

  const fetchAnalytics = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("transactions")
      .select(`amount, transaction_date, categories (name, color)`)
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: true });

    if (!error && data) {
      const categoryTotals: Record<string, { total: number; color: string }> = {};
      const monthlyTotals: Record<string, number> = {};
      let total = 0;

      data.forEach((t) => {
        const amount = Number(t.amount);
        total += amount;
        const categoryName = t.categories?.name || "Uncategorized";
        const categoryColor = t.categories?.color || "#888888";

        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = { total: 0, color: categoryColor };
        }
        categoryTotals[categoryName].total += amount;

        // Monthly aggregation
        const date = new Date(t.transaction_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + amount;
      });

      const chartData = Object.entries(categoryTotals)
        .map(([name, data]) => ({ name, value: data.total, color: data.color }))
        .sort((a, b) => b.value - a.value);

      const formattedMonthlyData = Object.entries(monthlyTotals).map(([month, amount]) => ({
        month: new Date(month + "-01").toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        amount,
      }));

      setChartData(chartData);
      setMonthlyData(formattedMonthlyData);
      setTotalSpending(total);
      setMonthlyAverage(formattedMonthlyData.length > 0 ? total / formattedMonthlyData.length : 0);
      setTopCategory(chartData[0]?.name || "None");
    }
  };

  const generateAIInsight = async () => {
    if (!user || chartData.length === 0) return;

    setLoadingInsight(true);
    try {
      const spendingData = chartData.map((c) => `${c.name}: ${formatCurrency(c.value, currency)}`).join(", ");
      const { data, error } = await supabase.functions.invoke("ai-insights", {
        body: { spendingData, totalSpending },
      });

      if (error) throw error;
      setAiInsight(data.insight || "No insights available at this time.");
      toast({ title: "✨ AI Insights Generated", description: "Check below for personalized recommendations" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to generate insights", variant: "destructive" });
    } finally {
      setLoadingInsight(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Analytics
            </h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>Dashboard</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSpending, currency)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent/10 rounded-full">
                <Calendar className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Avg</p>
                <p className="text-2xl font-bold">{formatCurrency(monthlyAverage, currency)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-secondary/10 rounded-full">
                <TrendingUp className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Category</p>
                <p className="text-xl font-bold truncate">{topCategory}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20 hover:shadow-lg hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-warning/10 rounded-full">
                <TrendingDown className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{chartData.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* AI Insights Card */}
        <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/30 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              <div>
                <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
                <p className="text-sm text-muted-foreground">Get personalized spending recommendations</p>
              </div>
            </div>
            <Button
              onClick={generateAIInsight}
              disabled={loadingInsight || chartData.length === 0}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
            >
              {loadingInsight ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>

          {aiInsight && (
            <div className="mt-4 p-4 bg-card/50 backdrop-blur-sm rounded-lg border animate-in fade-in slide-in-from-bottom-3 duration-500">
              <p className="text-sm leading-relaxed">{aiInsight}</p>
            </div>
          )}
        </Card>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie Chart */}
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <div className="h-1 w-8 bg-gradient-to-r from-primary to-accent rounded-full" />
                Spending by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value, currency)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No data available</p>
                  <p className="text-sm mt-2">Add expenses to see breakdown</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart */}
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <div className="h-1 w-8 bg-gradient-to-r from-accent to-secondary rounded-full" />
                Category Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value, currency)}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={800}>
                      {chartData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No comparison data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend */}
        {monthlyData.length > 0 && (
          <Card className="p-6 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <div className="h-1 w-8 bg-gradient-to-r from-secondary to-warning rounded-full" />
                Monthly Spending Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value, currency)}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorAmount)"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Analytics;