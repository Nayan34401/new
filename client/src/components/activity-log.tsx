import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Plus, Droplets, Sprout, Bug, Scissors, Wheat, Calendar, Trash2, ChevronRight, ArrowLeft, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Activity {
  id: string;
  type: string;
  notes: string;
  date: string;
}

interface Crop {
  id: string;
  name: string;
  image: string;
  activities: Activity[];
}

const activityIcons: Record<string, React.ElementType> = {
  "Irrigation": Droplets,
  "Fertilizer": Sprout,
  "Pesticide": Bug,
  "Harvest": Scissors,
  "Sowing": Wheat,
};

const activityColors: Record<string, string> = {
  "Irrigation": "bg-blue-100 text-blue-700 border-blue-200",
  "Fertilizer": "bg-green-100 text-green-700 border-green-200",
  "Pesticide": "bg-red-100 text-red-700 border-red-200",
  "Harvest": "bg-amber-100 text-amber-700 border-amber-200",
  "Sowing": "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const initialCrops: Crop[] = [
  {
    id: "1",
    name: "Tomatoes",
    image: "https://images.unsplash.com/photo-1546470427-227c7369a9b0?w=200&h=200&fit=crop",
    activities: [
      { id: "a1", type: "Irrigation", notes: "Applied 2 hours of drip irrigation", date: "2025-01-10" },
      { id: "a2", type: "Fertilizer", notes: "NPK fertilizer applied - 25kg", date: "2025-01-08" },
    ]
  },
  {
    id: "2",
    name: "Wheat",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop",
    activities: [
      { id: "a3", type: "Sowing", notes: "Planted new batch - 2 acres", date: "2025-01-05" },
    ]
  },
  {
    id: "3",
    name: "Rice",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop",
    activities: [
      { id: "a4", type: "Pesticide", notes: "Treated for stem borer", date: "2025-01-09" },
      { id: "a5", type: "Irrigation", notes: "Flooded paddy fields", date: "2025-01-07" },
    ]
  },
];

export function ActivityLog() {
  const [crops, setCrops] = useState<Crop[]>(initialCrops);
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [showAddCrop, setShowAddCrop] = useState(false);
  const [newCropName, setNewCropName] = useState("");
  
  const [activityType, setActivityType] = useState("Irrigation");
  const [activityNotes, setActivityNotes] = useState("");

  const handleAddCrop = () => {
    if (!newCropName.trim()) return;
    
    const newCrop: Crop = {
      id: Date.now().toString(),
      name: newCropName,
      image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=200&h=200&fit=crop",
      activities: [],
    };
    
    setCrops([newCrop, ...crops]);
    setNewCropName("");
    setShowAddCrop(false);
  };

  const handleAddActivity = () => {
    if (!selectedCrop || !activityNotes.trim()) return;
    
    const newActivity: Activity = {
      id: Date.now().toString(),
      type: activityType,
      notes: activityNotes,
      date: new Date().toISOString().split("T")[0],
    };
    
    setCrops(crops.map(c => 
      c.id === selectedCrop.id 
        ? { ...c, activities: [newActivity, ...c.activities] }
        : c
    ));
    
    setSelectedCrop({ ...selectedCrop, activities: [newActivity, ...selectedCrop.activities] });
    setActivityNotes("");
  };

  const handleDeleteActivity = (activityId: string) => {
    if (!selectedCrop) return;
    
    const updatedActivities = selectedCrop.activities.filter(a => a.id !== activityId);
    
    setCrops(crops.map(c => 
      c.id === selectedCrop.id 
        ? { ...c, activities: updatedActivities }
        : c
    ));
    
    setSelectedCrop({ ...selectedCrop, activities: updatedActivities });
  };

  const handleDeleteCrop = (cropId: string) => {
    setCrops(crops.filter(c => c.id !== cropId));
  };

  if (selectedCrop) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            data-testid="button-back"
            variant="ghost" 
            onClick={() => setSelectedCrop(null)}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Crops
          </Button>
        </div>

        <div className="flex items-center gap-5">
          <img 
            src={selectedCrop.image} 
            alt={selectedCrop.name}
            className="w-20 h-20 rounded-2xl object-cover"
          />
          <div>
            <h1 className="font-display text-3xl font-bold text-primary">{selectedCrop.name}</h1>
            <p className="text-muted-foreground">{selectedCrop.activities.length} activities logged</p>
          </div>
        </div>

        <Card className="border-2 bg-accent/30 rounded-3xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-muted-foreground flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground">Activity Type</Label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger data-testid="select-activity-type" className="mt-2 rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Irrigation">💧 Irrigation</SelectItem>
                    <SelectItem value="Fertilizer">🌱 Fertilizer</SelectItem>
                    <SelectItem value="Pesticide">🐛 Pesticide</SelectItem>
                    <SelectItem value="Harvest">✂️ Harvest</SelectItem>
                    <SelectItem value="Sowing">🌾 Sowing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Notes</Label>
                <div className="flex gap-2 mt-2">
                  <Textarea
                    data-testid="input-activity-notes"
                    placeholder="Add details about this activity..."
                    value={activityNotes}
                    onChange={(e) => setActivityNotes(e.target.value)}
                    className="rounded-xl border-2 min-h-[44px] resize-none"
                    rows={1}
                  />
                  <Button 
                    data-testid="button-add-activity"
                    onClick={handleAddActivity}
                    className="rounded-xl px-6"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <AnimatePresence>
            {selectedCrop.activities.map((activity, i) => {
              const Icon = activityIcons[activity.type] || Wheat;
              const colorClass = activityColors[activity.type] || "bg-gray-100 text-gray-700";
              
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card 
                    className="border-2 rounded-2xl hover:shadow-md transition-shadow"
                    data-testid={`activity-${activity.id}`}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <Badge variant="outline" className={`text-xs ${colorClass} border mb-1`}>
                          {activity.type}
                        </Badge>
                        <p className="text-sm text-foreground">{activity.notes}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {activity.date}
                        </div>
                        <Button
                          data-testid={`button-delete-activity-${activity.id}`}
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteActivity(activity.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {selectedCrop.activities.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Wheat className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No activities logged yet for this crop.</p>
              <p className="text-sm">Add your first activity above!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-primary">My Crops</h1>
        <div className="flex gap-3 items-center">
          <Button 
            data-testid="button-tts" 
            variant="outline" 
            className="rounded-xl border-2"
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Read Aloud
          </Button>
          <Button 
            data-testid="button-add-crop"
            onClick={() => setShowAddCrop(true)}
            className="rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Crop
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showAddCrop && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-2 border-primary/30 bg-primary/5 rounded-3xl">
              <CardContent className="p-5">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Crop Name</Label>
                    <Input
                      data-testid="input-new-crop-name"
                      placeholder="e.g. Tomatoes, Wheat, Rice..."
                      value={newCropName}
                      onChange={(e) => setNewCropName(e.target.value)}
                      className="mt-2 rounded-xl border-2"
                    />
                  </div>
                  <Button 
                    data-testid="button-save-crop"
                    onClick={handleAddCrop}
                    className="rounded-xl"
                  >
                    Add Crop
                  </Button>
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAddCrop(false)}
                    className="rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {crops.map((crop, i) => (
            <motion.div
              key={crop.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card 
                className="border-2 rounded-2xl hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group"
                data-testid={`crop-card-${crop.id}`}
                onClick={() => setSelectedCrop(crop)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <img 
                      src={crop.image} 
                      alt={crop.name}
                      className="w-16 h-16 rounded-xl object-cover bg-accent"
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                        {crop.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {crop.activities.length} {crop.activities.length === 1 ? "activity" : "activities"}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  
                  {crop.activities.length > 0 && (
                    <div className="flex gap-2 mt-4 flex-wrap">
                      {[...new Set(crop.activities.map(a => a.type))].slice(0, 3).map(type => {
                        const colorClass = activityColors[type] || "bg-gray-100 text-gray-700";
                        return (
                          <Badge key={type} variant="outline" className={`text-xs ${colorClass} border`}>
                            {type}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {crops.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Sprout className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold">No crops added yet</p>
          <p className="text-sm">Click "Add Crop" to get started!</p>
        </div>
      )}
    </div>
  );
}
