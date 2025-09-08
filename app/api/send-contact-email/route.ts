import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { name, email, message, courseInterest } = await request.json()

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: nome, email e mensagem' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      )
    }

    // Create email transporter - using Gmail SMTP (you may need to configure this)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    // Email content
    const emailSubject = `Novo contato via SwiftEDU - ${name}`
    const emailBody = `
      <h2>Novo contato via SwiftEDU</h2>
      <p><strong>Nome:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${courseInterest ? `<p><strong>Interesse em curso:</strong> ${courseInterest}</p>` : ''}
      <h3>Mensagem:</h3>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <hr>
      <p><small>Esta mensagem foi enviada através do formulário de contato do sistema SwiftEDU.</small></p>
    `

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: 'iqmasetti@masetti.net',
      replyTo: email,
      subject: emailSubject,
      html: emailBody,
    })

    return NextResponse.json(
      { success: true, message: 'Email enviado com sucesso!' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error sending contact email:', error)
    
    return NextResponse.json(
      { error: 'Erro interno do servidor. Tente novamente mais tarde.' },
      { status: 500 }
    )
  }
}