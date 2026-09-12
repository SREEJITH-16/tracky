import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PiggyBank } from "lucide-react";

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
}

interface AddSavingsGoalDialogProps {
  goal?: SavingsGoal | null;
  onSuccess?: () => void;
}

export const AddSavingsGoalDialog = ({ goal, onSuccess }: AddSavingsGoalDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    target_amount: "",
    current_amount: "0",
    target_date: "",
  });

  useEffect(() => {
    if (goal && open) {
      setFormData({
        name: goal.name,
        target_amount: goal.target_amount.toString(),
        current_amount: goal.current_amount.toString(),
        target_date: goal.target_date ? goal.target_date.split('T')[0] : "",
      });
    } else if (!open) {
      setFormData({
        name: "",
        target_amount: "",
        current_amount: "0",
        target_date: "",
      });
    }
  }, [goal, open]);

  useEffect(() => {
    if (goal) {
      setOpen(true);
    }
  }, [goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    
    const goalData = {
      name: formData.name,
      target_amount: parseFloat(formData.target_amount),
      current_amount: parseFloat(formData.current_amount),
      target_date: formData.target_date || null,
    };

    let error;
    if (goal) {
      // Update existing goal
      const result = await supabase
        .from("savings_goals")
        .update(goalData)
        .eq("id", goal.id);
      error = result.error;
    } else {
      // Create new goal
      const result = await supabase
        .from("savings_goals")
        .insert({ ...goalData, user_id: user.id });
      error = result.error;
    }

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: goal ? "Failed to update goal" : "Failed to create goal",
        variant: "destructive",
      });
    } else {
      toast({ title: goal ? "Goal updated successfully!" : "Goal created successfully!" });
      setOpen(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!goal && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <PiggyBank className="h-4 w-4" />
            Add Savings Goal
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? "Edit Savings Goal" : "Create Savings Goal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Goal Name *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Vacation Fund"
            />
          </div>

          <div>
            <Label htmlFor="target_amount">Target Amount *</Label>
            <Input
              id="target_amount"
              type="number"
              step="0.01"
              required
              value={formData.target_amount}
              onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="current_amount">Current Amount</Label>
            <Input
              id="current_amount"
              type="number"
              step="0.01"
              value={formData.current_amount}
              onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="target_date">Target Date (Optional)</Label>
            <Input
              id="target_date"
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (goal ? "Updating..." : "Creating...") : (goal ? "Update Goal" : "Create Goal")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
