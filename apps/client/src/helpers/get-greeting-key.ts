type TGreetingKey =
  | 'loungeGreetingMorning'
  | 'loungeGreetingAfternoon'
  | 'loungeGreetingEvening'
  | 'loungeGreetingNight';

// the group mostly shows up in the evening and stays late, so evening runs to 23:00
export const getGreetingKey = (hour: number): TGreetingKey => {
  if (hour >= 5 && hour < 12) return 'loungeGreetingMorning';
  if (hour >= 12 && hour < 18) return 'loungeGreetingAfternoon';
  if (hour >= 18 && hour < 23) return 'loungeGreetingEvening';

  return 'loungeGreetingNight';
};
