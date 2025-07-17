"use client"

import { useState, useEffect } from "react"
import { Button } from "./components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Input } from "./components/ui/input"
import { Label } from "./components/ui/label"
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group"
import { Textarea } from "./components/ui/textarea"
import { Badge } from "./components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs"
import { Progress } from "./components/ui/progress"
import { ScrollArea } from "./components/ui/scroll-area"
import { Separator } from "./components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select"
import { Clock, Users, MessageCircle, UserX, History, Plus, Send } from "lucide-react"
import { io } from "socket.io-client"

function App() {
  const [socket, setSocket] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [studentName, setStudentName] = useState("")
  const [isNameSet, setIsNameSet] = useState(false)
  const [currentPoll, setCurrentPoll] = useState(null)
  const [pollHistory, setPollHistory] = useState([])
  const [students, setStudents] = useState([])
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isKicked, setIsKicked] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [showResults, setShowResults] = useState(false)

  // Teacher poll creation state
  const [newQuestion, setNewQuestion] = useState("")
  const [newOptions, setNewOptions] = useState(["", ""])
  const [correctAnswer, setCorrectAnswer] = useState(null)
  const [timeLimit, setTimeLimit] = useState(60)

  useEffect(() => {
    // Check if student name is stored in sessionStorage
    const storedName = sessionStorage.getItem("studentName")
    if (storedName) {
      setStudentName(storedName)
      setIsNameSet(true)
    }

    // Initialize socket connection
    const newSocket = io("http://localhost:3001")
    setSocket(newSocket)

    // Socket event listeners
    newSocket.on("pollUpdate", (poll) => {
      setCurrentPoll(poll)
      setShowResults(true)
    })

    newSocket.on("studentsUpdate", (studentsList) => {
      setStudents(studentsList)
    })

    newSocket.on("timeUpdate", (time) => {
      setTimeLeft(time)
    })

    newSocket.on("pollEnded", () => {
      setShowResults(true)
    })

    newSocket.on("kicked", () => {
      setIsKicked(true)
    })

    newSocket.on("chatMessage", (message) => {
      setChatMessages((prev) => [...prev, message])
    })

    newSocket.on("pollHistory", (history) => {
      setPollHistory(history)
    })

    return () => {
      newSocket.close()
    }
  }, [])

  const handleRoleSelection = (role) => {
    setUserRole(role)
    if (socket) {
      socket.emit("setRole", role)
    }
  }

  const handleStudentNameSubmit = () => {
    if (studentName.trim() && socket) {
      sessionStorage.setItem("studentName", studentName)
      setIsNameSet(true)
      socket.emit("joinAsStudent", studentName)
    }
  }

  const handleCreatePoll = () => {
    if (socket && newQuestion.trim() && newOptions.every((opt) => opt.trim())) {
      const poll = {
        question: newQuestion,
        options: newOptions.filter((opt) => opt.trim()),
        correctAnswer,
        timeLimit,
      }
      socket.emit("createPoll", poll)

      // Reset form
      setNewQuestion("")
      setNewOptions(["", ""])
      setCorrectAnswer(null)
      setTimeLimit(60)
      setShowResults(false)
    }
  }

  const handleAnswerSubmit = () => {
    if (socket && selectedAnswer !== null && currentPoll) {
      socket.emit("submitAnswer", {
        pollId: currentPoll.id,
        answer: selectedAnswer,
        studentName,
      })
      setHasAnswered(true)
    }
  }

  const handleKickStudent = (studentId) => {
    if (socket) {
      socket.emit("kickStudent", studentId)
    }
  }

  const handleSendMessage = () => {
    if (socket && newMessage.trim()) {
      socket.emit("sendMessage", {
        studentName,
        message: newMessage,
      })
      setNewMessage("")
    }
  }

  const addOption = () => {
    setNewOptions([...newOptions, ""])
  }

  const updateOption = (index, value) => {
    const updated = [...newOptions]
    updated[index] = value
    setNewOptions(updated)
  }

  const removeOption = (index) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== index))
    }
  }

  // Role Selection Screen
  if (!userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Welcome to the Live Polling System</CardTitle>
            <CardDescription>
              Please select the role that best describes you to begin using the live polling system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card
                className="cursor-pointer hover:bg-purple-50 transition-colors border-2 hover:border-purple-200"
                onClick={() => handleRoleSelection("student")}
              >
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold mb-2">I'm a Student</h3>
                  <p className="text-sm text-muted-foreground">
                    Submit answers and view live poll results in real-time
                  </p>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer hover:bg-purple-50 transition-colors border-2 hover:border-purple-200"
                onClick={() => handleRoleSelection("teacher")}
              >
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold mb-2">I'm a Teacher</h3>
                  <p className="text-sm text-muted-foreground">Create polls, manage students, and monitor responses</p>
                </CardContent>
              </Card>
            </div>
            <Button className="w-full bg-purple-600 hover:bg-purple-700" disabled>
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Student Name Entry
  if (userRole === "student" && !isNameSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Let's Get Started</CardTitle>
            <CardDescription>
              If you're a student, you'll be able to submit your answers, participate in live polls, and see how your
              responses compare with your classmates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Enter your Name</Label>
              <Input
                id="name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Your name"
                onKeyPress={(e) => e.key === "Enter" && handleStudentNameSubmit()}
              />
            </div>
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={handleStudentNameSubmit}
              disabled={!studentName.trim()}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Kicked Student Screen
  if (isKicked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
              <UserX className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-red-600">You've been Kicked out !</h2>
            <p className="text-muted-foreground mb-4">
              Looks like the teacher has removed you from the poll system. Please try again sometime.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Teacher Dashboard
  if (userRole === "teacher") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
                <p className="text-muted-foreground">Create and manage live polls</p>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {students.length} Students
                </Badge>
              </div>
            </div>
          </div>

          <Tabs defaultValue="current" className="space-y-6">
            <TabsList>
              <TabsTrigger value="current">Current Poll</TabsTrigger>
              <TabsTrigger value="create">Create Poll</TabsTrigger>
              <TabsTrigger value="history">Poll History</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-6">
              {currentPoll ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>Question</CardTitle>
                          {currentPoll.isActive && (
                            <Badge variant="default" className="bg-green-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-800 text-white p-4 rounded-lg mb-6">{currentPoll.question}</div>
                        <div className="space-y-3">
                          {currentPoll.options.map((option, index) => {
                            const percentage =
                              currentPoll.totalVotes > 0
                                ? Math.round(((currentPoll.results[index] || 0) / currentPoll.totalVotes) * 100)
                                : 0
                            return (
                              <div key={index} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{option}</span>
                                  <span className="text-sm text-muted-foreground">{percentage}%</span>
                                </div>
                                <Progress value={percentage} className="h-2" />
                              </div>
                            )
                          })}
                        </div>
                        <div className="mt-6">
                          <Button
                            className="w-full"
                            disabled={currentPoll.isActive || students.every((s) => s.hasAnswered)}
                            onClick={() => {
                              // Switch to create tab
                              document.querySelector('[value="create"]').click()
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Ask a new question
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageCircle className="w-5 h-5" />
                          Chat
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-48 mb-4">
                          <div className="space-y-2">
                            {chatMessages.map((msg) => (
                              <div key={msg.id} className="bg-purple-100 p-2 rounded text-sm">
                                <div className="font-medium">{msg.studentName}</div>
                                <div>{msg.message}</div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Participants
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-48">
                          <div className="space-y-2">
                            {students.map((student) => (
                              <div
                                key={student.id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded"
                              >
                                <span className="font-medium">{student.name}</span>
                                <Button size="sm" variant="destructive" onClick={() => handleKickStudent(student.id)}>
                                  Kick out
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Active Poll</h3>
                    <p className="text-muted-foreground mb-4">Create a new poll to get started</p>
                    <Button onClick={() => document.querySelector('[value="create"]').click()}>
                      Create Your First Poll
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle>Let's Get Started</CardTitle>
                  <CardDescription>
                    You'll have the ability to create and manage polls, ask questions, and monitor your students'
                    responses in real-time.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="question">Enter your question</Label>
                    <Textarea
                      id="question"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="What is your question?"
                      className="min-h-[100px]"
                    />
                    <div className="text-right text-sm text-muted-foreground">{newQuestion.length}/100</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Label>Edit Options</Label>
                      {newOptions.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm">
                            {index + 1}
                          </div>
                          <Input
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                          />
                          {newOptions.length > 2 && (
                            <Button size="sm" variant="outline" onClick={() => removeOption(index)}>
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" onClick={addOption}>
                        + Add More option
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>Is it Correct?</Label>
                        <RadioGroup
                          value={correctAnswer?.toString() || ""}
                          onValueChange={(value) => setCorrectAnswer(Number.parseInt(value))}
                        >
                          {newOptions.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <RadioGroupItem value={index.toString()} id={`correct-${index}`} />
                              <Label htmlFor={`correct-${index}`}>{option || `Option ${index + 1}`}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label>Time Limit</Label>
                        <Select
                          value={timeLimit.toString()}
                          onValueChange={(value) => setTimeLimit(Number.parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30 seconds</SelectItem>
                            <SelectItem value="60">60 seconds</SelectItem>
                            <SelectItem value="90">90 seconds</SelectItem>
                            <SelectItem value="120">2 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={handleCreatePoll}
                    disabled={!newQuestion.trim() || !newOptions.every((opt) => opt.trim())}
                  >
                    Ask Question
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    View Poll History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-6">
                      {pollHistory.map((poll, index) => (
                        <div key={poll.id}>
                          <h3 className="font-semibold mb-2">Question {index + 1}</h3>
                          <div className="bg-gray-800 text-white p-4 rounded-lg mb-4">{poll.question}</div>
                          <div className="space-y-2">
                            {poll.options.map((option, optIndex) => {
                              const percentage =
                                poll.totalVotes > 0
                                  ? Math.round(((poll.results[optIndex] || 0) / poll.totalVotes) * 100)
                                  : 0
                              return (
                                <div key={optIndex} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-purple-600 rounded-full"></div>
                                    <span>{option}</span>
                                  </div>
                                  <span className="font-medium">{percentage}%</span>
                                </div>
                              )
                            })}
                          </div>
                          {index < pollHistory.length - 1 && <Separator className="mt-6" />}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  // Student Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {!currentPoll ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold mb-2">Wait for the teacher to ask questions..</h2>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Question 1</CardTitle>
                    {currentPoll.isActive && !hasAnswered && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-800 text-white p-4 rounded-lg mb-6">{currentPoll.question}</div>

                  {currentPoll.isActive && !hasAnswered ? (
                    <div className="space-y-4">
                      <RadioGroup
                        value={selectedAnswer?.toString() || ""}
                        onValueChange={(value) => setSelectedAnswer(Number.parseInt(value))}
                      >
                        {currentPoll.options.map((option, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-purple-50"
                          >
                            <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                            <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      <Button
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        onClick={handleAnswerSubmit}
                        disabled={selectedAnswer === null}
                      >
                        Submit
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentPoll.options.map((option, index) => {
                        const percentage =
                          currentPoll.totalVotes > 0
                            ? Math.round(((currentPoll.results[index] || 0) / currentPoll.totalVotes) * 100)
                            : 0
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-purple-600 rounded-full"></div>
                                <span className="font-medium">{option}</span>
                              </div>
                              <span className="text-sm font-medium">{percentage}%</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        )
                      })}
                      <div className="text-center mt-6 text-muted-foreground">
                        Wait for the teacher to ask a new question.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Chat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48 mb-4">
                    <div className="space-y-2">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className="bg-purple-100 p-2 rounded text-sm">
                          <div className="font-medium">{msg.studentName}</div>
                          <div>{msg.message}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    />
                    <Button size="sm" onClick={handleSendMessage}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
