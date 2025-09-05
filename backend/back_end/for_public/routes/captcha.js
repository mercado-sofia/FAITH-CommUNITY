import express from "express"
import { CaptchaService } from "../../utils/captcha.js"

const router = express.Router()

// Generate CAPTCHA challenge
router.get('/captcha', async (req, res) => {
  try {
    const { token, question } = await CaptchaService.generateMathCaptcha()
    res.json({
      success: true,
      captcha: {
        token,
        question
      }
    })
  } catch (error) {
    console.error('CAPTCHA generation error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate CAPTCHA'
    })
  }
})

export default router
