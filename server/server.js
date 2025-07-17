const express = require("express")
const http = require("http")
const socketIo = require("socket.io")
const cors = require("cors")
const path = require("path")

const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

app.use(cors())
app.use(express.json())

console.log(__dirname);

const distPath = path.join(__dirname, "../dist");
app.use(express.static(distPath));

// SPA fallback: for React Router etc.
app.get("", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Data storage
let currentPoll = null
const pollHistory = []
let students = []
const chatMessages = []
let pollTimer = null

io.on("connection", (socket) => {
  console.log("User connected:", socket.id)

  socket.on("setRole", (role) => {
    socket.join(role)

    if (role === "teacher") {
      socket.emit("pollHistory", pollHistory)
      socket.emit("studentsUpdate", students)
      chatMessages.forEach((msg) => socket.emit("chatMessage", msg))
      if (currentPoll) {
        socket.emit("pollUpdate", currentPoll)
      }
    }
  })

  socket.on("joinAsStudent", (name) => {
    const existingStudent = students.find((s) => s.socketId === socket.id)
    if (!existingStudent) {
      const student = {
        id: socket.id,
        name,
        hasAnswered: false,
        socketId: socket.id,
      }
      students.push(student)
      io.to("teacher").emit("studentsUpdate", students)
    }

    if (currentPoll) {
      socket.emit("pollUpdate", currentPoll)
    }
  })

  socket.on("createPoll", (pollData) => {
    // End current poll if exists
    if (pollTimer) {
      clearTimeout(pollTimer)
    }

    // Save current poll to history
    if (currentPoll) {
      currentPoll.isActive = false
      pollHistory.push({ ...currentPoll })
    }

    // Create new poll
    currentPoll = {
      id: Date.now().toString(),
      question: pollData.question,
      options: pollData.options,
      correctAnswer: pollData.correctAnswer,
      timeLimit: pollData.timeLimit,
      isActive: true,
      results: {},
      totalVotes: 0,
      createdAt: Date.now(),
    }

    // Reset student answers
    students.forEach((student) => {
      student.hasAnswered = false
      student.answer = undefined
    })

    // Broadcast new poll
    io.emit("pollUpdate", currentPoll)
    io.to("teacher").emit("studentsUpdate", students)

    // Start timer
    let timeLeft = pollData.timeLimit
    const timerInterval = setInterval(() => {
      timeLeft--
      io.emit("timeUpdate", timeLeft)

      if (timeLeft <= 0) {
        clearInterval(timerInterval)
        if (currentPoll) {
          currentPoll.isActive = false
          io.emit("pollEnded")
          io.emit("pollUpdate", currentPoll)
        }
      }
    }, 1000)

    pollTimer = timerInterval
  })

  socket.on("submitAnswer", (data) => {
    if (!currentPoll || currentPoll.id !== data.pollId || !currentPoll.isActive) {
      return
    }

    const student = students.find((s) => s.socketId === socket.id)
    if (student && !student.hasAnswered) {
      student.hasAnswered = true
      student.answer = data.answer

      // Update poll results
      if (!currentPoll.results[data.answer]) {
        currentPoll.results[data.answer] = 0
      }
      currentPoll.results[data.answer]++
      currentPoll.totalVotes++

      // Check if all students answered
      const allAnswered = students.every((s) => s.hasAnswered)
      if (allAnswered && pollTimer) {
        clearTimeout(pollTimer)
        currentPoll.isActive = false
        io.emit("pollEnded")
      }

      // Broadcast updates
      io.emit("pollUpdate", currentPoll)
      io.to("teacher").emit("studentsUpdate", students)
    }
  })

  socket.on("kickStudent", (studentId) => {
    const student = students.find((s) => s.id === studentId)
    if (student) {
      io.to(student.socketId).emit("kicked")
      students = students.filter((s) => s.id !== studentId)
      io.to("teacher").emit("studentsUpdate", students)
    }
  })

  socket.on("sendMessage", (data) => {
    const message = {
      id: Date.now().toString(),
      studentName: data.studentName,
      message: data.message,
      timestamp: Date.now(),
    }
    chatMessages.push(message)
    io.emit("chatMessage", message)
  })

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
    students = students.filter((s) => s.socketId !== socket.id)
    io.to("teacher").emit("studentsUpdate", students)
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
