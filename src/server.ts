import express from "express";
import { PrismaClient } from "@prisma/client";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger.json";

const port = 3000;
const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/movies", async (_, res) => {
    const movies = await prisma.movie.findMany({
        orderBy: {
            title: "asc",
        },
        include: {
            genres: true,
            languages: true,
        },
    });

    const total = movies.length;

    let totalDuration = 0;
    for (const movie of movies) {
        totalDuration += movie.duration;
    }
    const mediaDuration = total > 0 ? totalDuration / total : 0;

    res.json({
        total,
        mediaDuration,
        movies,
    });
});

app.post("/movies", async (req, res) => {
    const { title, genre_id, language_id, oscar_count, release_date, duration } =
    req.body;

    try {
        const movieWithSameTitle = await prisma.movie.findFirst({
            where: { title: { equals: title, mode: "insensitive" } },
        });

        if (movieWithSameTitle) {
            return res.status(409).send({
                message: "Ja existe um filme com esses valores cadastrado no banco",
            });
        }

        await prisma.movie.create({
            data: {
                title: title,
                genre_id: genre_id,
                language_id: language_id,
                oscar_count: oscar_count,
                release_date: new Date(release_date),
                duration: duration,
            },
        });
    } catch (error) {
        return res.status(500).send({
            message: "Falha ao cadastrar um filme, erro ao colocar os valores ",
        });
    }

    res.status(201).send();
});

app.put("/movies/:id", async (req, res) => {
    const id = Number(req.params.id);

    try {
        const movie = await prisma.movie.findUnique({
            where: { id },
        });

        if (!movie) {
            return res.status(404).send({ message: "Filme não encontrado" });
        }

        const data = { ...req.body };
        data.release_date = data.release_date
            ? new Date(data.release_date)
            : undefined;

        await prisma.movie.update({ where: { id }, data });
    } catch (error) {
        return res.status(500).send({ message: "Falha ao atualizar o registro" });
    }
    res.status(200).send();
});

app.delete("/movies/:id", async (req, res) => {
    const id = Number(req.params.id);

    try {
        const movie = await prisma.movie.findUnique({ where: { id } });

        if (!movie) {
            return res.status(404).send({ message: "O filme não foi encontrado" });
        }

        await prisma.movie.delete({ where: { id } });
    } catch (error) {
        return res
            .status(500)
            .send({ message: "Não foi possivel remover o filme" });
    }
    res.status(200).send();
});

app.get("/movies/:genreName", async (req, res) => {
    try {
        const genderFiltered = await prisma.movie.findMany({
            include: {
                genres: true,
                languages: true,
            },
            where: {
                genres: {
                    name: {
                        equals: req.params.genreName,
                        mode: "insensitive",
                    },
                },
            },
        });
        res.status(200).send(genderFiltered);
    } catch (error) {
        return res.status(500).send({ message: "Houve um erro durante o filtro" });
    }
});

app.put("/genres/:id", async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    try {
        const genre = await prisma.genre.findUnique({
            where: { id: Number(id) },
        });

        if (!genre) {
            return res.status(404).send({ message: "Gênero não encontrado." });
        }

        const existingGenre = await prisma.genre.findFirst({
            where: {
                name: { equals: name, mode: "insensitive" },
                id: { not: Number(id) },
            },
        });

        if (existingGenre) {
            return res
                .status(409)
                .send({ message: "Este nome de gênero já existe." });
        }

        const updatedGenre = await prisma.genre.update({
            where: { id: Number(id) },
            data: { name },
        });

        res.status(200).json(updatedGenre);
    } catch (error) {
        console.error(error);
        res
            .status(500)
            .send({ message: "Houve um problema ao atualizar o gênero." });
    }
});

app.post("/genres", async (req, res) => {
    const { name } = req.body;

    try {
        const existingGenre = await prisma.genre.findFirst({
            where: { name: { equals: name, mode: "insensitive" } },
        });

        if (existingGenre) {
            return res.status(409).send({
                message:
          "Um genero com o mesmo valor ja foi adicionado ao banco de daos",
            });
        }

        await prisma.genre.create({
            data: {
                name,
            },
        });
    } catch (error) {
        return res.status(500).send({
            message: "Ocorreu um erro ao colocar os novos valores ",
        });
    }
    res.status(201).send();
});

app.get("/genres", async (_, res) => {
    const generos = await prisma.genre.findMany({});
    res.json(generos);
});

app.delete("/genres/:id", async (req, res) => {
    const id = Number(req.params.id);

    try {
        const genre = await prisma.genre.findUnique({ where: { id } });
        if (!genre) {
            return res.status(404).send({ message: "O genero não foi encontrado" });
        }
        await prisma.genre.delete({ where: { id } });
    } catch (error) {
        return res.status(500).send({
            message:
        "Ocorrou um erro inesperado em nosso servidor,não se preocupe isso não e culpa sua",
        });
    }
    res.status(200).send();
});

app.listen(port, () => {
    console.log(`Servidor em execução em http://localhost ${port}`);
});

// No código abaixo, estamos buscando todos os filmes do banco de dados e em seguida, calculando a quantidade total de filmes e a média de duração.

// 2 - A quantidade total de filmes é simplesmente o número de filmes que foram retornados pela consulta.

// 3 - A média de duração é calculada somando a duração de todos os filmes e dividindo pelo total de filmes. Se não há filmes, definimos a média de duração como 0 para evitar divisão por zero.
