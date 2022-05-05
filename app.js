const express = require('express');
const axios = require('axios');
const { redirect } = require('express/lib/response');
const moodle_client = require("moodle-client");
const bodyParser = require('body-parser');

const PORT = process.env.Port || 8080;

const app = express();

app.set('view engine', 'ejs')
app.set('views', 'views')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

let token = '';
let password = '';
let login = '';
let user = 'Гость';
let server = '';
let courses = [];

app.get('/', async (req, res) => {
	try {
		if (login != '') {
			await getSiteInfo().then(res => { user = res.fullname });
			await getCourses().then(res => {
				courses = res;
			});

		}
		res.render('list', {
			title: 'Возможности',
			user: user,
			courses: courses
		})
	} catch (err) {
		res.status(500).json({ message: err.message || "Error Occured!" })
	}
});


app.post('/clear/:courseid', async (req, res) => {
	try {
		let courseID = req.params.courseid;

		if (login != '') {
			await getSiteInfo().then(res => { user = res.fullname });
			await getCourseForums(courseID).then(res => {
				res.forEach(async (forum) => {
					await getForumDiscussions(forum.instance).then(res => {
						if (res != '') {
							res.forEach(async (discussion) => {
								await deleteForumDiscussion(discussion.id);
							})
						}
					})
				})
			})

		}
		res.render('list', {
			title: 'Курсы',
			user: user,
			courses: courses
		})
	} catch (err) {
		res.status(500).json({ message: err.message || "Error Occured!" })
	}
});

/*  
* Получает новый токен для нового пользователя
 */

app.all('/gettoken', async (req, res) => {
	try {
		res.render('main', {
			title: 'Авторизация',
			token: token
		})
	} catch (err) {
		res.status(500).json({ message: err.message || "Error Occured!" })
	}
});

app.post('/apitoken', (req, res) => {
	server = req.body.server;
	login = req.body.login;
	password = req.body.password;
	axios
		.get(server + "/login/token.php", {
			params: {
				username: login,
				password: password,
				service: 'moodle_mobile_app'
			}
		})
		.then((response) => {
			token = response.data.token;
			console.log('Токен доступа:' + token)
			if (typeof token == "undefined") {
				password = '';
				server = '';
				login = '';
				user = 'Гость';
				courses = [];
				res.redirect('/gettoken');
			} else {
				res.redirect('/');
			}
		})
		.catch((err) => console.error(err))
})

/* 
* Функции для работы с API 
*/


async function deleteForumDiscussion(disID) {
	try {

		let client = await moodle_client.init({
			wwwroot: server,
			token: token
		})

		let forumDis = await client.call({
			wsfunction: "mod_forum_delete_post",
			args: {
				postid: disID
			}
		});
		return;

	} catch (err) {
		console.log("Ошибка deleteForumDiscussion: Unable to initialize the client: " + err);
	}

};

async function getForumDiscussions(forumID) {
	try {

		let client = await moodle_client.init({
			wwwroot: server,
			token: token
		})

		let forumDis = await client.call({
			wsfunction: "mod_forum_get_forum_discussions",
			args: {
				forumid: forumID
			}
		});
		return forumDis.discussions;

	} catch (err) {
		console.log("Ошибка getForumDiscussions: Unable to initialize the client: " + err);
	}

};

async function getSiteInfo() {
	try {
		let client = await moodle_client.init({
			wwwroot: server,
			token: token
		})
		let info = await client.call({
			wsfunction: "core_webservice_get_site_info",
		});
		return info;
	} catch (err) {
		console.log("Ошибка getSiteInfo: Unable to initialize the client: " + err);
	}
};

async function getCourses() {
	try {
		let client = await moodle_client.init({
			wwwroot: server,
			token: token
		})

		let courses = await client.call({
			wsfunction: "core_course_get_courses",
		});

		return courses;

	} catch (err) {
		console.log("Ошибка getCourses: Unable to initialize the client: " + err);
	}

};


async function getCourseForums(courseID) {
	try {
		let courseContent = await getCourseContent(courseID);
		let forums = [];
		courseContent.forEach(async (theme) => {
			if (theme.modules.length != 0) {

				theme.modules.forEach(async (module) => {
					if (module.modname == 'forum') {
						forums.push(await module);
					}
				})
			}
		})

		return forums;
	} catch (err) {
		console.log("Ошибка getCourseForums: Unable to initialize the client: " + err);
	}
}


async function getCourseContent(courseID) {
	try {

		let client = await moodle_client.init({
			wwwroot: server,
			token: token
		})

		let courseContent = await client.call({
			wsfunction: "core_course_get_contents",
			args: {
				courseid: courseID
			}
		});

		return courseContent;

	} catch (err) {
		console.log("Ошибка getCourseContent: Unable to initialize the client: " + err);
	}

};

/* 
* Обрабатывает пустые адреса 
*/

app.all('/*', async (req, res) => {
	try {
		res.send('Такого адреса нет');
	} catch (err) {
		res.status(500).json({ message: err.message || "Error Occured!" })
	}
});

/* 
* Проверяет подключение к порту и запуск сервера 
*/

async function start() {
	try {
		app.listen(PORT, () => {
			console.log(`Server has been started! PORT: ${PORT} :)`);
		});
	} catch (e) {
		console.log(e);
	}
};

start();