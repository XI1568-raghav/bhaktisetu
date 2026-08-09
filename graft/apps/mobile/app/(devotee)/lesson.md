# apps\mobile\app\(devotee)\lesson.tsx

- QuizQ · interface · L10-L10 — Shape of a single quiz question, including the correct option index used for scoring and feedback coloring.
- Lesson · interface · L11-L14 — Shape of a lesson entry in the static catalog, bundling reading content with its quiz questions.
- LessonScreen · function · L57-L186 — Screen component that drives the read → quiz → done lesson flow, scoring answers and persisting completion for the signed-in user.
- submitProgress · function · L78-L93 — Posts the finished lesson's id and computed score to the lessons/complete API so learner progress is saved server-side.
- answerCurrent · function · L95-L98 — Locks in the tapped answer choice, preventing changes once an option has been selected so feedback stays honest.
- nextQuestion · function · L100-L110 — Records the current answer and either advances to the next quiz question or, on the last one, finishes the lesson and triggers progress submission.
