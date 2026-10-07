import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface QuestionFormProps {
  onSubmit: (question: string) => void
}

export default function QuestionForm({ onSubmit }: QuestionFormProps) {
  const [quiz, setQuiz] = useState('')
  const [showSubmitText, setShowSubmitText] = useState(false)

  useEffect(() => {
    if (showSubmitText) {
      setTimeout(() => {
        setShowSubmitText(false)
      }, 7000)
    }
  }, [showSubmitText])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (quiz.trim()) {
      onSubmit(quiz)
      setQuiz('')
      setShowSubmitText(true)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <div className="flex-grow">
          <Input
            type="text"
            name="quiz"
            id="quiz"
            value={quiz}
            onChange={(e) => setQuiz(e.target.value)}
            placeholder="Ask a question..."
            className="flex-grow"
          />
          <div className="h-4 text-sm text-green-500 transition-all">
            {showSubmitText ? 'Your question has been submitted for review.' : ''}
          </div>
        </div>
        <Button type="submit">Ask</Button>
      </div>
    </form>
  )
}