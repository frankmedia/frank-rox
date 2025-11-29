// Motivational messages for different stages of the simulation

export const motivationalMessages = {
  start: [
    "Let's go! Time to crush this!",
    "You've got this! Stay strong!",
    "Let's make it count!",
    "Focus and execute!",
    "Show that beast what you're made of!",
  ],
  halfway: [
    "Halfway there! Keep pushing!",
    "You're doing amazing!",
    "Keep that energy up!",
    "Don't slow down now!",
    "You're stronger than you think!",
  ],
  near_end: [
    "Almost there! Dig deep!",
    "Final push! You've got this!",
    "So close! Don't give up!",
    "Finish strong!",
  ],
  completion: [
    "Amazing work! 🎉",
    "You absolutely crushed it! 💪",
    "That's how it's done! 🔥",
    "Incredible performance!",
    "You're a machine! 🚀",
  ],
};

export function getMotivationalMessage(
  currentStation: number,
  totalStations: number
): string {
  const progress = currentStation / totalStations;

  if (progress < 0.4) {
    return motivationalMessages.start[
      Math.floor(Math.random() * motivationalMessages.start.length)
    ];
  } else if (progress < 0.7) {
    return motivationalMessages.halfway[
      Math.floor(Math.random() * motivationalMessages.halfway.length)
    ];
  } else {
    return motivationalMessages.near_end[
      Math.floor(Math.random() * motivationalMessages.near_end.length)
    ];
  }
}

export function getCompletionMessage(): string {
  return motivationalMessages.completion[
    Math.floor(Math.random() * motivationalMessages.completion.length)
  ];
}


