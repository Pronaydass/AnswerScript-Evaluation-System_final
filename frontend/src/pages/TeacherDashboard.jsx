import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  Container, Typography, Button, Box, Paper, TextField, CircularProgress, Alert, Stack,
  Grid, Card, CardContent, Stepper, Step, StepLabel, Chip, LinearProgress, Avatar,
  Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Divider
} from '@mui/material'
import {
  PlayArrow, ArrowForward, CloudUpload, Description, UploadFile,
  Visibility, Delete, CheckCircle, Info, Close, Assessment, TrendingUp, Assignment,
  FileDownload as FileDownloadIcon, School, WorkspacePremium
} from '@mui/icons-material'
import PDFUploader from '../components/PDFUploader'
import EvaluationProgress from '../components/EvaluationProgress'

const API = 'https://answerscript-evaluation-system-final-5u91.onrender.com'

export default function TeacherDashboard() {
  const [studentFile, setStudentFile] = useState(null)
  const [studentFiles, setStudentFiles] = useState([])
  const [modelFile, setModelFile] = useState(null)
  const [qpFile, setQPFile] = useState(null)
  const [rubricJson, setRubricJson] = useState('')
  const [modelText, setModelText] = useState("")
  const [maxMarks, setMaxMarks] = useState(25)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ total: 120, evaluated: 0, pending: 120 })
  const [error, setError] = useState('')
  const [activeStep, setActiveStep] = useState(0)
  const [batchMode, setBatchMode] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/results`)
      setStats({ total: 120, evaluated: res.data.length, pending: 120 - res.data.length })
    } catch (e) {}
  }

  const handleMultipleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files)
    const totalFiles = studentFiles.length + newFiles.length

    if (totalFiles > 50) {
      setError(`Maximum 50 scripts allowed. You have ${studentFiles.length}, adding ${newFiles.length} = ${totalFiles}`)
      return
    }

    const existingNames = studentFiles.map(f => f.name)
    const uniqueNewFiles = newFiles.filter(f =>!existingNames.includes(f.name))

    if (uniqueNewFiles.length < newFiles.length) {
      setError(`${newFiles.length - uniqueNewFiles.length} duplicate files skipped`)
    }

    setStudentFiles(prev => [...prev,...uniqueNewFiles])
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index) => {
    setStudentFiles(prev => prev.filter((_, i) => i!== index))
  }

  const handlePreview = (file) => {
    setPreviewFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewFile(null)
    setPreviewUrl('')
  }

  const handleEval = async () => {
    setError('')
    if (batchMode) {
      if (studentFiles.length === 0) return setError('Please select scripts')
      if (!modelFile && !modelText.trim()) return setError('Model Answer is required')
    } else {
      if (!studentFile) return setError('Please upload student script')
      if (!modelFile && !modelText.trim()) return setError('Model Answer is required')
    }

    setUploading(true)
    setProgress(0)
    setCurrentStep('Starting...')
    setIsComplete(false)

    const form = new FormData()
    if (batchMode) {
      studentFiles.forEach((file) => form.append('scripts', file, file.name))
    } else {
      form.append('script', studentFile)
    }
    if (qpFile) form.append('question_paper', qpFile)
    if (modelFile) form.append('model_answer', modelFile)
    if (rubricJson) form.append('rubric', rubricJson)
    form.append('model_text', modelText)
    form.append('max_marks', parseInt(maxMarks))

    try {
      const endpoint = batchMode ? '/evaluate-batch-stream' : '/evaluate-stream'
      const response = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        body: form
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            setProgress(data.progress || 0)
            setCurrentStep(data.status || '')

            if (data.complete) {
              setIsComplete(true)
              setTimeout(() => navigate('/evaluation'), 1000)
            }
            if (data.error) {
              setError(data.status)
              setUploading(false)
            }
          }
        }
      }
    } catch (err) {
      setError('Evaluation failed: ' + err.message)
      setUploading(false)
    }
  }

  const steps = ['Upload Documents', 'AI Analysis', 'Complete']

  const FileCard = ({ title, icon, file, onUpload, onDelete, accept, description, required = false }) => (
    <Paper sx={{
      p: 3.5,
      border: '1px solid #e0e3e7',
      background: file? '#f8fafc' : '#ffffff',
      height: '100%',
      borderRadius: 2,
      boxShadow: file? '0 4px 12px rgba(30, 58, 138, 0.08)' : '0 1px 3px rgba(0,0,0,0.05)',
      transition: 'all 0.3s ease',
      '&:hover': {
        borderColor: '#1e3a8a',
        boxShadow: '0 8px 24px rgba(30, 58, 138, 0.12)',
        transform: 'translateY(-2px)'
      }
    }}>
      <Stack spacing={2.5}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: file? '#1e3a8a' : '#f1f5f9',
            color: file? '#ffffff' : '#475569',
            display: 'flex'
          }}>
            {icon}
          </Box>
          <Box flex={1}>
            <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
              {title} {required && <Typography component="span" sx={{ color: '#dc2626' }}>*</Typography>}
            </Typography>
          </Box>
          {file && <CheckCircle sx={{ color: '#059669', fontSize: 24 }} />}
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, fontSize: '0.875rem' }}>
          {description}
        </Typography>

        {file? (
          <Stack spacing={2}>
            <Chip
              label={file.name}
              size="medium"
              sx={{
                fontWeight: 600,
                bgcolor: '#dbeafe',
                color: '#1e40af',
                borderRadius: 1.5,
                fontSize: '0.8rem',
                border: '1px solid #bfdbfe',
                py: 2.5
              }}
              onDelete={onDelete}
              deleteIcon={<Delete sx={{ fontSize: 18 }} />}
            />
            <Button
              size="medium"
              startIcon={<Visibility sx={{ fontSize: 18 }} />}
              onClick={() => handlePreview(file)}
              variant="outlined"
              sx={{
                borderColor: '#cbd5e1',
                color: '#475569',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                py: 1,
                borderRadius: 1.5,
                '&:hover': {
                  borderColor: '#94a3b8',
                  bgcolor: '#f8fafc'
                }
              }}
            >
              Preview Document
            </Button>
          </Stack>
        ) : (
          <PDFUploader label={`Select ${title}`} onFileSelect={onUpload} accept={accept} />
        )}
      </Stack>
    </Paper>
  )

  if (uploading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 4 }}>
        <Container maxWidth="md">
          <EvaluationProgress
            progress={progress}
            currentStep={currentStep}
            isComplete={isComplete}
          />
        </Container>
      </Box>
    )
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      background: '#f5f7fa',
      py: 4
    }}>
      <Container maxWidth="xl">
        <Paper sx={{
          p: 4,
          mb: 3,
          borderRadius: 2,
          border: '1px solid #e0e3e7',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <Stack direction="row" alignItems="center" spacing={3}>
            <Box sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: '#1e3a8a',
              color: '#ffffff',
              display: 'flex'
            }}>
              <School sx={{ fontSize: 32 }} />
            </Box>
            <Box flex={1}>
              <Typography variant="h4" sx={{
                fontWeight: 800,
                color: '#0f172a',
                fontSize: '1.75rem',
                letterSpacing: '-0.5px'
              }}>
                Script Sense AI
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.95rem', mt: 0.5 }}>
                AI-Powered Script Evaluation Platform
              </Typography>
            </Box>
            <Button
              startIcon={<FileDownloadIcon />}
              variant="contained"
              onClick={() => window.open(`${API}/download/excel/all`, '_blank')}
              sx={{
                bgcolor: '#1e3a8a',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
                py: 1.5,
                boxShadow: '0 4px 12px rgba(30, 58, 138, 0.3)',
                '&:hover': {
                  bgcolor: '#1e40af',
                  boxShadow: '0 6px 20px rgba(30, 58, 138, 0.4)'
                }
              }}
            >
              Export All Data
            </Button>
          </Stack>
        </Paper>

        <Grid container spacing={3} mb={3}>
          {[
            { label: 'Total Scripts', val: stats.total, color: '#1e3a8a', icon: <Assignment /> },
            { label: 'Evaluated', val: stats.evaluated, color: '#059669', icon: <CheckCircle /> },
            { label: 'Pending Review', val: stats.pending, color: '#d97706', icon: <WorkspacePremium /> }
          ].map((s, i) => (
            <Grid item xs={12} md={4} key={i}>
              <Card sx={{
                border: '1px solid #e0e3e7',
                borderRadius: 2,
                background: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.3s ease',
                overflow: 'hidden',
                position: 'relative',
                '&:hover': {
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  borderColor: '#cbd5e1'
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  bgcolor: s.color
                }
              }}>
                <CardContent sx={{ p: 3.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
                    <Box>
                      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1.5, fontSize: '0.7rem' }}>
                        {s.label}
                      </Typography>
                      <Typography variant="h2" sx={{ fontWeight: 800, color: s.color, mt: 0.5, fontSize: '3rem' }}>
                        {s.val}
                      </Typography>
                    </Box>
                    <Box sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: `${s.color}15`,
                      color: s.color,
                      display: 'flex'
                    }}>
                      {s.icon}
                    </Box>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={(s.val / stats.total) * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#f1f5f9',
                      '&.MuiLinearProgress-bar': {
                        bgcolor: s.color,
                        borderRadius: 4
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Card sx={{
          mb: 3,
          borderRadius: 2,
          border: '1px solid #e0e3e7',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1.5rem', letterSpacing: '-0.5px' }}>
                  Create New Evaluation
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.95rem' }}>
                  Upload documents to initiate assessment workflow
                </Typography>
              </Box>
              <FormControlLabel
                control={<Switch checked={batchMode} onChange={e => { setBatchMode(e.target.checked); setStudentFile(null); setStudentFiles([]) }} sx={{
                  '&.MuiSwitch-switchBase.Mui-checked': { color: '#1e3a8a' },
                  '&.MuiSwitch-switchBase.Mui-checked +.MuiSwitch-track': { bgcolor: '#1e3a8a' }
                }} />}
                label={<Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '0.95rem' }}>{batchMode? "Batch Mode" : "Single Mode"}</Typography>}
              />
            </Stack>

            <Divider sx={{ mb: 4, borderColor: '#e5e7eb' }} />

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
              {typeof error === 'string'? error : error?.msg || error?.detail || JSON.stringify(error)}
            </Alert>}
            {loading && <Box mb={3}><Stepper activeStep={activeStep} alternativeLabel>{steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper></Box>}

            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <FileCard
                  title="Question Paper"
                  icon={<Description sx={{ fontSize: 22 }} />}
                  file={qpFile}
                  onUpload={setQPFile}
                  onDelete={() => setQPFile(null)}
                  accept=".pdf,.png,.jpg,.jpeg"
                  description="Upload question paper. System extracts marks automatically."
                  required
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <Paper sx={{
                  p: 3.5,
                  border: '1px solid #e0e3e7',
                  background: (modelFile || modelText)? '#f8fafc' : '#ffffff',
                  height: '100%',
                  borderRadius: 2,
                  boxShadow: (modelFile || modelText)? '0 4px 12px rgba(30, 58, 138, 0.08)' : '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: '#1e3a8a',
                    boxShadow: '0 8px 24px rgba(30, 58, 138, 0.12)',
                    transform: 'translateY(-2px)'
                  }
                }}>
                  <Stack spacing={2.5}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: '#1e3a8a',
                        color: '#ffffff',
                        display: 'flex'
                      }}>
                        <CloudUpload sx={{ fontSize: 22 }} />
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                        Model Answer <Typography component="span" sx={{ color: '#dc2626' }}>*</Typography>
                      </Typography>
                      {(modelFile || modelText) && <CheckCircle sx={{ color: '#059669', fontSize: 22, ml: 'auto' }} />}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, fontSize: '0.875rem' }}>
                      Provide reference answer via text input or file upload
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      placeholder="Type model answer here..."
                      value={modelText}
                      onChange={e => setModelText(e.target.value)}
                      size="small"
                      sx={{
                        '&.MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          bgcolor: '#f8fafc',
                          fontSize: '0.9rem',
                          '& fieldset': { borderColor: '#e5e7eb' },
                          '&:hover fieldset': { borderColor: '#94a3b8' },
                          '&.Mui-focused fieldset': { borderColor: '#1e3a8a' }
                        }
                      }}
                    />
                    {modelFile? (
                      <Stack spacing={2}>
                        <Chip
                          label={modelFile.name}
                          size="medium"
                          onDelete={() => setModelFile(null)}
                          deleteIcon={<Delete sx={{ fontSize: 18 }} />}
                          sx={{
                            bgcolor: '#dbeafe',
                            color: '#1e40af',
                            fontWeight: 600,
                            borderRadius: 1.5,
                            fontSize: '0.8rem',
                            border: '1px solid #bfdbfe',
                            py: 2.5
                          }}
                        />
                        <Button
                          size="medium"
                          startIcon={<Visibility sx={{ fontSize: 18 }} />}
                          onClick={() => handlePreview(modelFile)}
                          variant="outlined"
                          sx={{
                            borderColor: '#cbd5e1',
                            color: '#475569',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            py: 1,
                            borderRadius: 1.5,
                            '&:hover': {
                              borderColor: '#94a3b8',
                              bgcolor: '#f8fafc'
                            }
                          }}
                        >
                          Preview Document
                        </Button>
                      </Stack>
                    ) : (
                      <PDFUploader label="Upload PDF File" onFileSelect={setModelFile} accept=".pdf,.png,.jpg,.jpeg" />
                    )}
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={3}>
                <Paper sx={{
                  p: 3.5,
                  border: '1px solid #e0e3e7',
                  background: (studentFile || studentFiles.length > 0)? '#f8fafc' : '#ffffff',
                  height: '100%',
                  borderRadius: 2,
                  boxShadow: (studentFile || studentFiles.length > 0)? '0 4px 12px rgba(30, 58, 138, 0.08)' : '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: '#1e3a8a',
                    boxShadow: '0 8px 24px rgba(30, 58, 138, 0.12)',
                    transform: 'translateY(-2px)'
                  }
                }}>
                  <Stack spacing={2.5}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: '#1e3a8a',
                        color: '#ffffff',
                        display: 'flex'
                      }}>
                        <UploadFile sx={{ fontSize: 22 }} />
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                        {batchMode? 'Student Scripts' : 'Student Script'} <Typography component="span" sx={{ color: '#dc2626' }}>*</Typography>
                      </Typography>
                      {(studentFile || studentFiles.length > 0) && <CheckCircle sx={{ color: '#059669', fontSize: 22, ml: 'auto' }} />}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, fontSize: '0.875rem' }}>
                      {batchMode? `Upload multiple files. Selected: ${studentFiles.length}/50` : 'Upload single script file'}
                    </Typography>
                    {batchMode? (
                      <>
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<CloudUpload sx={{ fontSize: 18 }} />}
                          sx={{
                            borderColor: '#cbd5e1',
                            color: '#475569',
                            borderRadius: 1.5,
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            py: 1.25,
                            '&:hover': {
                              borderColor: '#94a3b8',
                              bgcolor: '#f8fafc'
                            }
                          }}
                        >
                          Select Multiple Files
                          <input
                            ref={fileInputRef}
                            type="file"
                            hidden
                            multiple
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={handleMultipleFileSelect}
                          />
                        </Button>
                        {studentFiles.length > 0 && (
                          <Stack spacing={1.5} sx={{ maxHeight: 180, overflow: 'auto', pr: 1 }}>
                            <Chip
                              label={`${studentFiles.length} files selected`}
                              onDelete={() => setStudentFiles([])}
                              size="medium"
                              sx={{
                                bgcolor: '#dbeafe',
                                color: '#1e40af',
                                fontWeight: 700,
                                borderRadius: 1.5,
                                fontSize: '0.8rem',
                                border: '1px solid #bfdbfe',
                                py: 2.5
                              }}
                              deleteIcon={<Delete sx={{ fontSize: 18 }} />}
                            />
                            {studentFiles.map((file, idx) => (
                              <Chip
                                key={idx}
                                label={`${idx + 1}. ${file.name}`}
                                size="medium"
                                onDelete={() => removeFile(idx)}
                                deleteIcon={<Close sx={{ fontSize: 16 }} />}
                                sx={{
                                  justifyContent: 'space-between',
                                  bgcolor: '#f1f5f9',
                                  borderRadius: 1.5,
                                  fontSize: '0.8rem',
                                  py: 2.5,
                                  '&:hover': { bgcolor: '#e2e8f0' }
                                }}
                              />
                            ))}
                            <Button
                              size="medium"
                              startIcon={<Visibility sx={{ fontSize: 18 }} />}
                              onClick={() => handlePreview(studentFiles[0])}
                              variant="outlined"
                              sx={{
                                borderColor: '#cbd5e1',
                                color: '#475569',
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                                py: 1,
                                borderRadius: 1.5,
                                '&:hover': {
                                  borderColor: '#94a3b8',
                                  bgcolor: '#f8fafc'
                                }
                              }}
                            >
                              Preview First File
                            </Button>
                          </Stack>
                        )}
                      </>
                    ) : (
                      studentFile? (
                        <Stack spacing={2}>
                          <Chip
                            label={studentFile.name}
                            size="medium"
                            onDelete={() => setStudentFile(null)}
                            deleteIcon={<Delete sx={{ fontSize: 18 }} />}
                            sx={{
                              bgcolor: '#dbeafe',
                              color: '#1e40af',
                              fontWeight: 600,
                              borderRadius: 1.5,
                              fontSize: '0.8rem',
                              border: '1px solid #bfdbfe',
                              py: 2.5
                            }}
                          />
                          <Button
                            size="medium"
                            startIcon={<Visibility sx={{ fontSize: 18 }} />}
                            onClick={() => handlePreview(studentFile)}
                            variant="outlined"
                            sx={{
                              borderColor: '#cbd5e1',
                              color: '#475569',
                              textTransform: 'none',
                              fontWeight: 700,
                              fontSize: '0.875rem',
                              py: 1,
                              borderRadius: 1.5,
                              '&:hover': {
                                borderColor: '#94a3b8',
                                bgcolor: '#f8fafc'
                              }
                            }}
                          >
                            Preview Document
                          </Button>
                        </Stack>
                      ) : (
                        <PDFUploader label="Upload Script" onFileSelect={setStudentFile} accept=".pdf,.png,.jpg,.jpeg" />
                      )
                    )}
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={3}>
                <Paper sx={{
                  p: 3.5,
                  border: '1px solid #e0e3e7',
                  bgcolor: '#ffffff',
                  height: '100%',
                  borderRadius: 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: '#94a3b8',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    transform: 'translateY(-2px)'
                  }
                }}>
                  <Stack spacing={2.5}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Rubric Schema</Typography>
                      <Chip label="Optional" size="medium" variant="outlined" sx={{ borderColor: '#e2e8f0', color: '#64748b', height: 24, fontSize: '0.7rem', fontWeight: 600 }} />
                    </Stack>
                    <Alert severity="info" icon={<Info sx={{ fontSize: 18 }} />} sx={{
                      py: 1,
                      borderRadius: 1.5,
                      bgcolor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      fontSize: '0.8rem'
                    }}>
                      <Typography variant="body2" sx={{ color: '#1e40af', fontSize: '0.8rem', lineHeight: 1.6 }}>
                        Only needed for custom keywords if not extracted from QP
                      </Typography>
                    </Alert>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder='{"questions":[{"number":"1","max_marks":10}]}'
                      value={rubricJson}
                      onChange={e => setRubricJson(e.target.value)}
                      size="small"
                      sx={{
                        '&.MuiOutlinedInput-root': {
                          borderRadius: 1.5,
                          bgcolor: '#f8fafc',
                          fontSize: '0.875rem',
                          '& fieldset': { borderColor: '#e5e7eb' },
                          '&:hover fieldset': { borderColor: '#94a3b8' },
                          '&.Mui-focused fieldset': { borderColor: '#1e3a8a' }
                        }
                      }}
                    />
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

                    <Stack direction="row" spacing={2} mt={4} pt={3} sx={{ borderTop: '1px solid #e5e7eb' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={loading? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                onClick={handleEval}
                disabled={loading}
                sx={{
                  bgcolor: '#1e3a8a',
                  fontWeight: 700,
                  px: 5,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  boxShadow: '0 4px 12px rgba(30, 58, 138, 0.3)',
                  '&:hover': {
                    bgcolor: '#1e40af',
                    boxShadow: '0 6px 20px rgba(30, 58, 138, 0.4)',
                    transform: 'translateY(-2px)'
                  },
                  '&:disabled': {
                    bgcolor: '#cbd5e1',
                    color: '#94a3b8',
                    boxShadow: 'none'
                  }
                }}
              >
                {loading? 'Processing Evaluation...' : 'Start Evaluation'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Button
          variant="outlined"
          endIcon={<ArrowForward />}
          onClick={() => navigate('/evaluation')}
          sx={{
            fontWeight: 700,
            borderColor: '#cbd5e1',
            color: '#475569',
            borderRadius: 2,
            px: 3,
            py: 1.25,
            textTransform: 'none',
            fontSize: '0.9rem',
            bgcolor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            '&:hover': {
              borderColor: '#94a3b8',
              bgcolor: '#f8fafc',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }
          }}
        >
          View All Evaluations
        </Button>
      </Container>

      <Dialog
        open={!!previewFile}
        onClose={closePreview}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            border: '1px solid #e5e7eb'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e5e7eb', bgcolor: '#f8fafc' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1.1rem' }}>{previewFile?.name}</Typography>
            <IconButton onClick={closePreview} sx={{ color: '#64748b' }}><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {previewFile?.type === 'application/pdf'? (
            <iframe src={previewUrl} width="100%" height="600px" style={{ border: '1px solid #e5e7eb', borderRadius: 8 }} />
          ) : (
            <img src={previewUrl} alt="Preview" style={{ width: '100%', height: 'auto', borderRadius: 8, border: '1px solid #e5e7eb' }} />
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #e5e7eb', p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={closePreview} sx={{ color: '#64748b', fontWeight: 700, textTransform: 'none', fontSize: '0.9rem' }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
