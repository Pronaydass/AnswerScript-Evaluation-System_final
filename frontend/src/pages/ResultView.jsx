import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  Container, Typography, Box, Paper, Stack, Chip, Button,
  Accordion, AccordionSummary, AccordionDetails, Grid, CardContent, Card,
  LinearProgress, Divider, Alert, DialogTitle, DialogContent, DialogActions, Dialog, CircularProgress
} from '@mui/material'
import { ExpandMore, ArrowBack, CheckCircle, Cancel, Print, Delete, Done, Close, TrendingUp, Assessment, Download as DownloadIcon, FileDownload as FileDownloadIcon } from '@mui/icons-material'

const API_URL = 'https://answerscript-evaluation-system-final-5u91.onrender.com'

export default function ResultView() {
  const { roll } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgKey, setImgKey] = useState(0)
  const imgRefs = useRef([])

  useEffect(() => {
    fetchResult()
  }, [])

  const fetchResult = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await axios.get(`${API_URL}/result/${roll}`)
      if (res.data.error) {
        setError(`Result not found for Roll: ${roll}`)
        return
      }
      console.log('[RESULT] Full:', res.data)
      console.log('[RESULT] Markings:', res.data.markings)
      console.log('[RESULT] Image Paths:', res.data.image_paths)
      setResult(res.data)
    } catch (err) {
      console.error('[FETCH ERROR]', err)
      setError('Failed to fetch result')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      await axios.delete(`${API_URL}/result/${roll}`)
      alert('Result deleted successfully')
      navigate('/evaluation')
    } catch (err) {
      alert('Failed to delete result')
    } finally {
      setDeleting(false)
      setDeleteDialog(false)
    }
  }

  const handleImageLoad = () => {
    console.log(`[IMG LOADED] Page ${currentPage + 1}`)
    setImgLoaded(true)
  }

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    setImgLoaded(false)
    setImgKey(prev => prev + 1)
  }

  const renderMarkings = () => {
    if (!result?.markings ||!imgRefs.current[currentPage] ||!imgLoaded) {
      console.log('[MARKING SKIP] Image not loaded yet')
      return null
    }

    const img = imgRefs.current[currentPage]
    if (!img ||!img.naturalWidth || img.naturalWidth === 0) {
      console.log('[MARKING SKIP] NaturalWidth = 0')
      return null
    }

    const natW = img.naturalWidth
    const natH = img.naturalHeight

    const greenCount = result.markings.green?.filter(m => m.page === currentPage).length || 0
    const redCount = result.markings.red?.filter(m => m.page === currentPage).length || 0
    const tickCount = result.markings.ticks?.filter(t => t.page === currentPage).length || 0
    const crossCount = result.markings.crosses?.filter(c => c.page === currentPage).length || 0
    const boxCount = result.markings.boxes?.filter(b => b.page === currentPage).length || 0

    console.log(`[RENDER MARKINGS] Page ${currentPage} | ${natW}x${natH} | Green:${greenCount} Red:${redCount} Ticks:${tickCount} Crosses:${crossCount} Boxes:${boxCount}`)

    return (
      <>
        {result.markings.green?.filter(m => m.page === currentPage).map((m, i) => (
          <Box key={`green-${currentPage}-${i}`} sx={{
            position: 'absolute',
            left: `${(m.x / natW) * 100}%`,
            top: `${(m.y / natH) * 100}%`,
            width: `${(m.width / natW) * 100}%`,
            height: `${Math.max(m.height, 3)}px`,
            background: 'linear-gradient(90deg, #00C853 0%, #00E676 100%)',
            pointerEvents: 'none',
            zIndex: 10,
            borderRadius: 0.5,
            boxShadow: '0 0 8px rgba(0,200,83,0.8)'
          }} />
        ))}

        {result.markings.red?.filter(m => m.page === currentPage).map((m, i) => (
          <Box key={`red-${currentPage}-${i}`} sx={{
            position: 'absolute',
            left: `${(m.x / natW) * 100}%`,
            top: `${(m.y / natH) * 100}%`,
            width: `${(m.width / natW) * 100}%`,
            height: `${Math.max(m.height, 3)}px`,
            background: 'linear-gradient(90deg, #D50000 0%, #FF1744 100%)',
            pointerEvents: 'none',
            zIndex: 10,
            borderRadius: 0.5,
            boxShadow: '0 0 8px rgba(213,0,0,0.8)'
          }} />
        ))}

        {result.markings.ticks?.filter(t => t.page === currentPage).map((t, i) => (
          <Done key={`tick-${currentPage}-${i}`} sx={{
            position: 'absolute',
            left: `${(t.x / natW) * 100}%`,
            top: `${(t.y / natH) * 100}%`,
            color: '#00C853',
            fontSize: t.size || 32,
            fontWeight: 900,
            zIndex: 11,
            filter: 'drop-shadow(0 2px 6px rgba(0,200,83,1))'
          }} />
        ))}

        {result.markings.crosses?.filter(c => c.page === currentPage).map((c, i) => (
          <Close key={`cross-${currentPage}-${i}`} sx={{
            position: 'absolute',
            left: `${(c.x / natW) * 100}%`,
            top: `${(c.y / natH) * 100}%`,
            color: '#D50000',
            fontSize: c.size || 32,
            fontWeight: 900,
            zIndex: 11,
            filter: 'drop-shadow(0 2px 6px rgba(213,0,0,1))'
          }} />
        ))}

        {result.markings.boxes?.filter(b => b.page === currentPage).map((b, i) => (
          <Box key={`box-${currentPage}-${i}`} sx={{
            position: 'absolute',
            left: `${(b.x / natW) * 100}%`,
            top: `${(b.y / natH) * 100}%`,
            width: `${(b.width / natW) * 100}%`,
            height: `${(b.height / natH) * 100}%`,
            border: `${b.stroke || 4}px solid #00C853`,
            borderRadius: 2,
            pointerEvents: 'none',
            zIndex: 9,
            boxShadow: '0 0 16px rgba(0,200,83,0.6), inset 0 0 12px rgba(0,200,83,0.3)'
          }} />
        ))}
      </>
    )
  }

  const renderStudentAnswer = (text) => {
    if (!text || text.trim().length === 0) {
      return <Typography variant="body2" color="error" sx={{ fontStyle: 'italic' }}>Not answered</Typography>
    }

    const lines = text.split('\n').filter(l => l.trim())
    const bulletPattern = /^\s*[\-\*•]\s+|^\s*\d+[\.\)]\s+|^\s*[a-z]\)\s+|^\s*[iv]+\)\s+/i
    const bulletLines = lines.filter(l => bulletPattern.test(l))
    const hasBullets = bulletLines.length > 1

    if (!hasBullets) {
      return <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{text}</Typography>
    }

    return (
      <Box sx={{ pl: 1 }}>
        {lines.map((line, i) => {
          const isBullet = bulletPattern.test(line)
          const cleanLine = line.replace(bulletPattern, '').trim()
          if (!cleanLine) return null

          return (
            <Stack key={i} direction="row" spacing={1.5} sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 20, color: '#1e3a8a', fontWeight: 700 }}>
                {isBullet? '•' : ''}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {cleanLine}
              </Typography>
            </Stack>
          )
        })}
      </Box>
    )
  }

  if (loading) return <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={60} sx={{ color: '#1e3a8a' }} /></Box>
  if (error) return <Container maxWidth="lg" sx={{ py: 8 }}><Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert></Container>
  if (!result) return <Container maxWidth="lg" sx={{ py: 8 }}><Alert severity="warning" sx={{ borderRadius: 2 }}>No result data</Alert></Container>

  const percentage = result.percentage || 0
  const gradeColor = percentage >= 80? '#059669' : percentage >= 60? '#1e3a8a' : percentage >= 40? '#d97706' : '#dc2626'
  const gradeText = percentage >= 80? "Excellent" : percentage >= 60? "Good" : percentage >= 40? "Average" : "Needs Improvement"

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', py: 4 }}>
      <Container maxWidth="xl">
        <Paper sx={{
          p: 3.5,
          mb: 3,
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.3)',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(30, 58, 138, 0.08)'
        }}>
          <Stack direction="row" spacing={3} alignItems="center">
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/evaluation')}
              variant="outlined"
              sx={{
                borderColor: '#cbd5e1',
                color: '#475569',
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                px: 2.5,
                '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' }
              }}
            >
              Back
            </Button>
            <Box flex={1}>
              <Typography variant="h5" fontWeight={800} sx={{ color: '#0f172a', fontSize: '1.5rem', letterSpacing: '-0.5px' }}>
                Evaluation Result
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.9rem' }}>
                Roll: <strong>{result.roll_no}</strong> | Name: <strong>{result.name}</strong> | Subject: <strong>{result.subject_name || 'N/A'}</strong>
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button
                startIcon={<FileDownloadIcon />}
                variant="outlined"
                onClick={() => window.open(`${API_URL}/download/excel/${roll}`, '_blank')}
                sx={{
                  borderColor: '#10b981',
                  color: '#10b981',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 2.5,
                  '&:hover': { borderColor: '#059669', bgcolor: '#ecfdf5' }
                }}
              >
                Excel
              </Button>
              <Button
                startIcon={<DownloadIcon />}
                variant="outlined"
                onClick={() => window.open(`${API_URL}/download/pdf/${roll}`, '_blank')}
                sx={{
                  borderColor: '#ef4444',
                  color: '#ef4444',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 2.5,
                  '&:hover': { borderColor: '#dc2626', bgcolor: '#fef2f2' }
                }}
              >
                PDF
              </Button>
              <Button
                startIcon={<Print />}
                variant="outlined"
                onClick={() => window.print()}
                sx={{
                  borderColor: '#cbd5e1',
                  color: '#475569',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 2.5,
                  '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' }
                }}
              >
                Print
              </Button>
              <Button
                startIcon={<Delete />}
                variant="outlined"
                color="error"
                onClick={() => setDeleteDialog(true)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 2.5
                }}
              >
                Delete
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 3,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              position: 'relative',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 12px 48px rgba(0,0,0,0.1)',
                transform: 'translateY(-4px)'
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                  Total Score
                </Typography>
                <Typography variant="h3" fontWeight={900} sx={{ color: '#1e3a8a', mt: 0.5, fontSize: '3rem' }}>
                  {result.total_score}/{result.total_max}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={percentage}
                  sx={{
                    mt: 2,
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#f1f5f9',
                    '&.MuiLinearProgress-bar': {
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                      borderRadius: 4
                    }
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 3,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              position: 'relative',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 12px 48px rgba(0,0,0,0.1)',
                transform: 'translateY(-4px)'
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: `linear-gradient(135deg, ${gradeColor} 0%, ${gradeColor}dd 100%)`
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                  Percentage
                </Typography>
                <Typography variant="h3" fontWeight={900} sx={{ color: gradeColor, mt: 0.5, fontSize: '3rem' }}>
                  {percentage}%
                </Typography>
                <Chip
                  icon={<TrendingUp sx={{ fontSize: 16 }} />}
                  label={gradeText}
                  sx={{
                    mt: 2,
                    fontWeight: 700,
                    bgcolor: `${gradeColor}15`,
                    color: gradeColor,
                    border: `1px solid ${gradeColor}40`
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 3,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              position: 'relative',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 12px 48px rgba(0,0,0,0.1)',
                transform: 'translateY(-4px)'
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)'
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                  Questions
                </Typography>
                <Typography variant="h3" fontWeight={900} sx={{ color: '#8b5cf6', mt: 0.5, fontSize: '3rem' }}>
                  {result.feedback?.length || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>Evaluated</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Card sx={{
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 3,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              position: 'relative',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 12px 48px rgba(0,0,0,0.1)',
                transform: 'translateY(-4px)'
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
                  Status
                </Typography>
                <Typography variant="h4" fontWeight={900} sx={{ color: '#10b981', mt: 0.5, fontSize: '2rem' }}>
                  Completed
                </Typography>
                <Stack direction="row" spacing={1} mt={2} alignItems="center">
                  <CheckCircle sx={{ color: '#10b981', fontSize: 20 }} />
                  <Typography variant="caption" color="text.secondary">AI Evaluated</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {result.image_paths && result.image_paths.length > 0 && (
          <Card sx={{
            mb: 3,
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center" mb={3}>
                <Assessment sx={{ color: '#1e3a8a' }} />
                <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a', fontSize: '1.25rem', letterSpacing: '-0.5px' }}>
                  Marked Script - Page {currentPage + 1} of {result.image_paths.length}
                </Typography>
                <Box flex={1} />
                <Button
                  disabled={currentPage === 0}
                  onClick={() => handlePageChange(currentPage - 1)}
                  variant="outlined"
                  sx={{
                    borderColor: '#cbd5e1',
                    color: '#475569',
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' }
                  }}
                >
                  Prev
                </Button>
                <Button
                  disabled={currentPage === result.image_paths.length - 1}
                  onClick={() => handlePageChange(currentPage + 1)}
                  variant="outlined"
                  sx={{
                    borderColor: '#cbd5e1',
                    color: '#475569',
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' }
                  }}
                >
                  Next
                </Button>
              </Stack>

              {result.image_paths[currentPage] && (
                <Paper elevation={0} sx={{ p: 1.5, border: '2px solid #e5e7eb', borderRadius: 2, bgcolor: '#ffffff' }}>
                  <Box sx={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                    <img
                      key={`img-${currentPage}-${imgKey}`}
                      ref={el => imgRefs.current[currentPage] = el}
                      src={`${API_URL}${result.image_paths[currentPage]}`}
                      alt={`Script page ${currentPage + 1}`}
                      style={{ width: '100%', display: 'block', borderRadius: 8 }}
                      onLoad={handleImageLoad}
                    />
                    {renderMarkings()}
                  </Box>
                </Paper>
              )}
            </CardContent>
          </Card>
        )}

        <Card sx={{
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 3,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
        }}>
          <CardContent sx={{ p: 3.5 }}>
            <Typography variant="h6" fontWeight={800} gutterBottom sx={{ color: '#0f172a', fontSize: '1.25rem', letterSpacing: '-0.5px' }}>
              Question-wise Analysis
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Stack spacing={2}>
              {result.feedback && result.feedback.length > 0? result.feedback.map((item, idx) => (
                <Accordion key={idx} defaultExpanded={idx === 0} sx={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px!important',
                  boxShadow: 'none',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { margin: '16px 0' }
                }}>
                  <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2.5, py: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" width="100%" alignItems="center" pr={2}>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#0f172a' }}>
                        {item.question}: {item.question_text}
                      </Typography>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        {item.score >= item.max_marks * 0.6? <CheckCircle sx={{ color: '#10b981', fontSize: 24 }} /> : <Cancel sx={{ color: '#dc2626', fontSize: 24 }} />}
                        <Chip
                          label={`${item.score}/${item.max_marks}`}
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            bgcolor: item.score >= item.max_marks * 0.8? '#10b98115' : item.score >= item.max_marks * 0.6? '#3b82f615' : item.score >= item.max_marks * 0.4? '#f59e0b15' : '#dc262615',
                            color: item.score >= item.max_marks * 0.8? '#059669' : item.score >= item.max_marks * 0.6? '#1e3a8a' : item.score >= item.max_marks * 0.4? '#d97706' : '#dc2626',
                            border: `1px solid ${item.score >= item.max_marks * 0.8? '#10b98140' : item.score >= item.max_marks * 0.6? '#3b82f640' : item.score >= item.max_marks * 0.4? '#f59e0b40' : '#dc262640'}`
                          }}
                        />
                      </Stack>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 2.5, pb: 2.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={item.percentage || 0}
                      sx={{
                        mb: 2.5,
                        height: 8,
                        borderRadius: 4,
                        bgcolor: '#f1f5f9',
                        '&.MuiLinearProgress-bar': {
                          background: item.score >= item.max_marks * 0.8? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : item.score >= item.max_marks * 0.6? 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)' : item.score >= item.max_marks * 0.4? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          borderRadius: 4
                        }
                      }}
                    />

                    <Box sx={{ mb: 2.5, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5, color: '#0f172a' }}>Student Answer:</Typography>
                      {renderStudentAnswer(item.student_answer)}
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>{item.feedback}</Typography>

                                     {item.metrics && (
                      <Stack direction="row" spacing={1} mt={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        <Chip label={`SBERT: ${item.metrics.sbert}`} size="small" variant="outlined" sx={{ borderColor: '#e2e8f0', fontWeight: 600 }} />
                        <Chip label={`Cosine: ${item.metrics.cosine}`} size="small" variant="outlined" sx={{ borderColor: '#e2e8f0', fontWeight: 600 }} />
                        <Chip label={`Keywords: ${item.metrics.keywords}`} size="small" variant="outlined" sx={{ borderColor: '#e2e8f0', fontWeight: 600 }} />
                        <Chip label={`Semantic: ${item.metrics.semantic}`} size="small" variant="outlined" sx={{ borderColor: '#e2e8f0', fontWeight: 600 }} />
                      </Stack>
                    )}

                    {item.matched_keywords && item.matched_keywords.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>Matched Keywords: </Typography>
                        <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                          {item.matched_keywords.slice(0, 10).map((kw, i) => (
                            <Chip
                              key={i}
                              label={kw}
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: '#10b981',
                                color: '#059669',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                bgcolor: '#10b98108'
                              }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              )) : (
                <Alert severity="info" sx={{ borderRadius: 2 }}>No questions found in evaluation</Alert>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Container>

      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', fontSize: '1.25rem' }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete result for Roll: <strong>{roll}</strong>?</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setDeleteDialog(false)} disabled={deleting} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
            {deleting? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
