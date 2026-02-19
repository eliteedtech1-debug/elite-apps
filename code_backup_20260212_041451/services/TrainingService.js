// Training Video Script Generator
const generateTrainingScript = () => {
  return {
    "video_1_quick_start": {
      title: "Quick Start - Generate Your First Timetable (3 minutes)",
      script: [
        "Welcome to Elite Scholar Enhanced Time Slots!",
        "In just 3 minutes, you'll create a complete Nigerian school timetable.",
        "Step 1: Login with your school credentials",
        "Step 2: Navigate to Academic → Class Timetable → Time Slots",
        "Step 3: Select your section - Primary or Secondary", 
        "Step 4: Click 'Nigerian Templates' - see the two options",
        "Step 5: Choose 'Primary Standard' and click Generate",
        "Amazing! 55 time slots created instantly following Nigerian education standards",
        "Your timetable includes assembly, 7 academic periods, breaks, and lunch",
        "That's it! You've created a complete, culturally-compliant timetable in under 1 minute!"
      ],
      duration: "3:00",
      target_audience: "School Administrators"
    },
    
    "video_2_ai_optimization": {
      title: "AI Optimization - Smart Scheduling (5 minutes)",
      script: [
        "Now let's make your timetable even better with AI optimization",
        "Click the 'AI Optimize' button - watch the magic happen",
        "The AI analyzes 45+ teacher assignments in your school",
        "It automatically schedules Math and Science in morning hours",
        "Why? Students focus better in the morning for STEM subjects",
        "The AI also balances teacher workload - no one gets overloaded",
        "It prevents conflicts - no teacher in two places at once",
        "See the optimization score? Higher means better schedule",
        "Green status means your timetable is conflict-free and optimal",
        "AI optimization follows Nigerian education best practices!"
      ],
      duration: "5:00", 
      target_audience: "Academic Coordinators"
    },
    
    "video_3_cultural_features": {
      title: "Cultural Integration - Islamic & Nigerian Features (4 minutes)",
      script: [
        "Elite Scholar respects Islamic practices and Nigerian culture",
        "Prayer times are automatically integrated - Dhuhr at 12:20, Asr at 15:45",
        "Special Jummah Friday prayer slot - 45 minutes at 12:15",
        "During Ramadan, enable Ramadan mode for modified schedules",
        "Schedule automatically adjusts to 8:30 AM - 1:30 PM during fasting",
        "Nigerian holidays are automatically accommodated",
        "The system follows Lagos timezone (GMT+1) for accurate prayer times",
        "Cultural compliance score shows how well your schedule respects Islamic practices",
        "This ensures your school maintains religious obligations while maximizing learning"
      ],
      duration: "4:00",
      target_audience: "Islamic School Administrators"
    }
  };
};

// Interactive Tutorial Generator
const generateInteractiveTutorial = () => {
  return {
    steps: [
      {
        target: "#section-selector",
        title: "Select Your Section",
        content: "Choose Primary, Secondary, or Nursery to get started",
        position: "bottom"
      },
      {
        target: "#nigerian-templates-btn", 
        title: "Nigerian Templates",
        content: "Click here to access pre-built Nigerian school schedules",
        position: "top"
      },
      {
        target: "#template-preview",
        title: "Template Preview", 
        content: "Preview shows the complete daily schedule with timings",
        position: "right"
      },
      {
        target: "#generate-btn",
        title: "Generate Timetable",
        content: "One click creates 55 time slots following Nigerian standards",
        position: "bottom"
      },
      {
        target: "#ai-optimize-btn",
        title: "AI Optimization",
        content: "Let AI optimize your schedule for better learning outcomes",
        position: "top"
      }
    ],
    completion_message: "Congratulations! You've mastered the Enhanced Time Slot System!"
  };
};

module.exports = { generateTrainingScript, generateInteractiveTutorial };
