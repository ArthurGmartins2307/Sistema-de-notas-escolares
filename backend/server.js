const express = require('express')
const mysql = require('mysql2')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Arthurzinho3003',
    database: 'projeto_integrado'
})

db.connect((err) => {
    if(err){
        console.log(err)
    } else {
        console.log('MySQL conectado!')
    }
})

app.get('/alunos', (req, res) => {

    const sql = `
        SELECT
            aluno.id,
            aluno.nome,
            aluno.nascimento,
            aluno.turma,
            aluno.sexo,
            notas.matematica,
            notas.portugues,
            notas.historia,
            notas.geografia,
            notas.biologia,
            notas.quimica,
            notas.fisica,
            notas.sociologia,
            notas.filosofia,
            notas.artes,
            notas.educacao_fisica,
            notas.media
        FROM aluno
        LEFT JOIN notas
        ON aluno.id = notas.id_aluno
    `

    db.query(sql, (err, result) => {
        if(err){
            console.error(err)
            res.status(500).json({ error: err.message })
        } else {
            res.json(result)
        }
    })

})

app.post('/alunos', (req, res) => {
    const { nome, turma, nascimento, sexo } = req.body
    if (!nome || !turma) {
        return res.status(400).json({ error: 'Nome e turma são obrigatórios.' })
    }

    const sqlAluno = 'INSERT INTO aluno (nome, turma, nascimento, sexo) VALUES (?, ?, ?, ?)'
    db.query(sqlAluno, [nome, turma, nascimento, sexo], (err, result) => {
        if(err){
            console.error(err)
            return res.status(500).json({ error: 'Erro ao salvar aluno no banco de dados.' })
        }
        
        const id_aluno = result.insertId
        
        const sqlNotas = `
            INSERT INTO notas (
                id_aluno, matematica, portugues, historia, geografia, biologia,
                quimica, fisica, sociologia, filosofia, artes, educacao_fisica
            ) VALUES (?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        `
        db.query(sqlNotas, [id_aluno], (errNotas) => {
            if(errNotas){
                console.error(errNotas)
                return res.status(500).json({ error: 'Erro ao inicializar notas do aluno.' })
            }
            res.status(201).json({ id: id_aluno, message: 'Aluno cadastrado com sucesso!' })
        })
    })
})

app.put('/alunos/:id/notas', (req, res) => {
    const { id } = req.params
    const {
        matematica, portugues, historia, geografia, biologia,
        quimica, fisica, sociologia, filosofia, artes, educacao_fisica
    } = req.body

    const sql = `
        UPDATE notas SET
            matematica = ?, portugues = ?, historia = ?, geografia = ?, biologia = ?,
            quimica = ?, fisica = ?, sociologia = ?, filosofia = ?, artes = ?, educacao_fisica = ?
        WHERE id_aluno = ?
    `
    const values = [
        matematica, portugues, historia, geografia, biologia,
        quimica, fisica, sociologia, filosofia, artes, educacao_fisica,
        id
    ]

    db.query(sql, values, (err, result) => {
        if(err){
            console.error(err)
            res.status(500).json({ error: 'Erro ao salvar notas no banco de dados.' })
        } else {
            res.json({ message: 'Notas atualizadas com sucesso!' })
        }
    })
})

app.delete('/alunos/:id', (req, res) => {
    const { id } = req.params

    const sqlDeleteNotas = 'DELETE FROM notas WHERE id_aluno = ?'
    db.query(sqlDeleteNotas, [id], (errNotas) => {
        if(errNotas){
            console.error(errNotas)
            return res.status(500).json({ error: 'Erro ao excluir notas do aluno.' })
        }

        const sqlDeleteAluno = 'DELETE FROM aluno WHERE id = ?'
        db.query(sqlDeleteAluno, [id], (errAluno) => {
            if(errAluno){
                console.error(errAluno)
                return res.status(500).json({ error: 'Erro ao excluir aluno do banco de dados.' })
            }
            res.json({ message: 'Aluno removido com sucesso!' })
        })
    })
})

app.listen(3001, () => {
    console.log('Servidor rodando na porta 3001')
})