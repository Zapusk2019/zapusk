require("../../../app");

var xlsx = require("node-xlsx");
global.UserManager = new (class {
  constructor() {
    this.arUsers = {};
    this.Users = {};
    this.UsersByID = {};
    this.arPermissionR = {
      admin: 4,
      manager: 3,
      region_manager: 2,
      content: 1
    };
    this.speakersFile = `${rootPath}/file/Speakers.xlsx`;
    this.userFile = `${rootPath}/file/Users.xlsx`;
  }

  async init() {
    this.arUsers = await userModel.find();
    this.Users = this.arUsers.byKey("token");
    this.UsersByID = this.arUsers.byKey("_id");
  }

  addToCache(User) {
    this.Users[User.token] = User;
    this.UsersByID[User.id] = User;
    return User;
  }

  getItem = item => (item !== undefined ? item : "");

  async loadSpeakers() {
    var file = xlsx.parse(this.speakersFile)[0].data; // парсим 1ый лист
    if (!file[0]) {
      return erJson("Нечитаемый файл");
    }

    file.splice(0, 1)[0];
    for (let item of file) {
      if (item[1]) {
        let password = genPass("number", 4);

        let user = {
          ids: await userModel.genToken(),
          name: this.getItem(item[2]),
          sname: this.getItem(item[3]),
          email: this.getItem(item[4]),
          phone: this.getItem(item[5]),
          photo: this.getItem(item[1]),
          hardSkills: [],
          softSkills: [],
          active: true,
          token: genToken(),
          password: genPass("number", 4),
          pin: genPass("number", 4),
          permission: "speaker",
          country: "",
          city: "",
          prefix: "",
          companyName: this.getItem(item[0]),
          companyUrl: this.getItem(item[6]),
          vacanciesUrl: this.getItem(item[13]),
          businessSphere: this.getItem(item[7]),
          questionsForSpeaker: {
            yourProduct: this.getItem(item[8]),
            companyTasks: this.getItem(item[9]),
            positions: this.getItem(item[10]),
            candidatsTasks: this.getItem(item[11]),
            intership: this.getItem(item[12])
          },
          block: this.getItem(item[14]),
          recording_status: 1
        };

        let ch = await this.checkUsers(user.email);
        if (!ch) {
          let us = await userModel.create(user);
          this.addToCache(us);
        } else {
          console.log("Уже создан");
          // ch.country = tagsManager.country.filter(
          //   v => v.name === item[4]
          // )[0]._id;
          // ch.photo = item[12]
          //   ? "https://getfile.dokpub.com/yandex/get/" + item[12]
          //   : "";
          await ch.save();
          this.addToCache(ch);
        }
      }
    }
  }

  async loadUsers() {
    var file = xlsx.parse(this.userFile)[0].data; // парсим 1ый лист
    if (!file[0]) {
      return erJson("Нечитаемый файл");
    }

    file.splice(0, 1)[0];
    for (let item of file) {
      if (item[2]) {
        let user = {
          ids: await userModel.genToken(),
          name: this.getItem(item[0]),
          sname: this.getItem(item[1]),
          email: this.getItem(item[4]),
          phone: this.getItem(item[3]),
          photo: "",
          hardSkills: [],
          softSkills: [],
          token: genToken(),
          pin: genPass("number", 4),
          password: genPass("number", 4),
          active: true,
          permission: "user",
          country: "",
          city: "",
          prefix: "",
          birthday: this.getItem(item[2]),
          university: this.getItem(item[5]),
          speciality: this.getItem(item[6]),
          endingYear: this.getItem(item[7]),
          questionsForUser: {
            digital: this.getItem(item[11]),
            english: this.getItem(item[9]),
            anotherLanguage: this.getItem(item[10]),
            isHackaton: this.getItem(item[12]),
            isWorldSkills: this.getItem(item[13]),
            courses: this.getItem(item[14]),
            enoughMoney: this.getItem(item[8]),
            achievements: "",
            isWorking: this.getItem(item[15])
          }
        };

        let ch = await this.checkUsers(user.email);
        if (!ch) {
          let us = await userModel.create(user);
          this.addToCache(us);
        } else {
          console.log("Уже создан");
          await ch.save();
          this.addToCache(ch);
        }
      }
    }
  }

  async checkUsers(email) {
    if (empty(email)) return false;
    let user = await userModel.findOne({ email });
    if (!empty(user)) return user;
    else return false;
  }

  async checkToken(token) {
    if (empty(token)) return erJson("invalid_token");

    if (this.Users[token] !== undefined) return suJson(this.Users[token]);
    let User = await userModel.findOne({ token: token });
    if (empty(User)) return erJson("invalid_token");
    return suJson(this.addToCache(User));
  }

  async checkAdmin(token) {
    if (empty(token)) return erJson("invalid_token");

    if (this.Users[token] !== undefined)
      if (this.Users[token].permission === "admin")
        return suJson(this.Users[token]);

    let User = await userModel.findOne({ token: token });

    console.log(User);

    if (User.permission !== "admin") return erJson("invalid_token");
    return suJson(this.addToCache(User));
  }

  async auth(ids, password) {
    if (empty(ids)) return erJson("Enter email");

    if (empty(password)) return erJson("Enter password");

    let User = await userModel.findOne({ ids: parseInt(ids) });

    if (empty(User)) return erJson("Auth not found");

    if (User.pin !== password) return erJson("Wrong password");

    // if (!User.auth(password)) return erJson("Wrong password");

    if (!User.active)
      return erJson("Unfortunately, your account has been deactivated.");

    return suJson(this.addToCache(User).forAdmin());
  }

  async authCrmAdmin(email, password) {
    if (empty(email)) return erJson("Enter email");

    if (empty(password)) return erJson("Enter password");

    let User = await userModel.findOne({ email });
    if (empty(User)) return erJson("Auth not found");

    if (User.permission != "admin") return erJson("LoL");

    if (User.pin !== password) return erJson("Wrong password");

    // if (!User.auth(password)) return erJson("Wrong password");

    if (!User.active)
      return erJson("Unfortunately, your account has been deactivated.");

    return suJson(this.addToCache(User).forAdmin());
  }

  async adminAuth(email, muser) {
    if (empty(email)) return erJson("Введите email");

    let emailAns = userModel.validEmail(email);
    if (!isJson(emailAns)) return emailAns;

    email = email.toLowerCase();

    if (muser.permission != "admin") return erJson("Ну перестань");

    let User = await userModel.findOne({ email });

    if (empty(User)) return erJson("Неверный email");

    if (!User.active)
      return erJson("К великому сожалению, данный аккаунт деактивирован.");

    return suJson(this.addToCache(User).forAdmin());
  }

  async registration(arUser) {
    let data = await userModel.regUser(arUser);
    if (!isJson(data)) return data;
    let User = ans(data);
    // await this.sendLoginData(User); // отправляет письмо на почту, потом надо раскомментить
    return suJson(this.addToCache(User).forAdmin());
  }

  async edit(id, arUser) {
    if (empty(id)) return erJson("Auth not found");

    let user = await userModel.findOne({ _id: arUser._id });

    user.name = arUser.name || user.name;
    user.phone = arUser.phone || user.phone;
    user.sname = arUser.sname || user.sname;
    user.email = arUser.email || user.email;
    user.prefname = arUser.prefname || user.prefname;
    user.country = arUser.country || user.country;
    user.city = arUser.city || user.city;
    user.prefix = arUser.prefix || user.prefix;
    user.photo = arUser.photo || user.photo;
    user.hardSkills = arUser.hardSkills || user.hardSkills;
    user.softSkills = arUser.softSkills || user.softSkills;

    if (user.permission === "speaker") {
      user.companyName = arUser.companyName || "";
      user.companyUrl = arUser.companyUrl || "";
      user.vacanciesUrl = arUser.vacanciesUrl || "";
      user.businessSphere = arUser.businessSphere || "";

      user.questionsForSpeaker.yourProduct =
        arUser.questionsForSpeaker.yourProduct || "";
      user.questionsForSpeaker.companyTasks =
        arUser.questionsForSpeaker.companyTasks || "";
      user.questionsForSpeaker.positions =
        arUser.questionsForSpeaker.positions || "";
      user.questionsForSpeaker.candidatsTasks =
        arUser.questionsForSpeaker.candidatsTasks || "";
      user.questionsForSpeaker.intership =
        arUser.questionsForSpeaker.intership || "";
    } else if (user.permission === "user") {
      user.birthday = arUser.birthday || "";
      user.university = arUser.university || "";
      user.speciality = arUser.speciality || "";
      user.endingYear = arUser.endingYear || "";

      user.questionsForUser.enoughMoney =
        arUser.questionsForUser.enoughMoney || "";
      user.questionsForUser.digital = arUser.questionsForUser.digital || "";
      user.questionsForUser.english = arUser.questionsForUser.english || "";
      user.questionsForUser.anotherLanguage =
        arUser.questionsForUser.anotherLanguage || "";
      user.questionsForUser.isWorldSkills =
        arUser.questionsForUser.isWorldSkills || "";
      user.questionsForUser.isHackaton =
        arUser.questionsForUser.isHackaton || "";
      user.questionsForUser.courses = arUser.questionsForUser.courses || "";
      user.questionsForUser.isWorking = arUser.questionsForUser.isWorking || "";
    }

    await user.save();
    this.addToCache(user);
    return suJson("su");
  }

  async remove(arUser) {
    if (empty(arUser._id)) return erJson("Auth not found");

    let user = await userModel.findOne({ _id: arUser._id });

    await user.remove();
    this.addToCache(user);
    return suJson("su");
  }

  async remove(asSpeaker) {
    if (empty(asSpeaker._id)) return erJson("Auth not found");

    let speaker = await userModel.findOne({ _id: asSpeaker._id });

    await speaker.remove();
    this.addToCache(speaker);
    return suJson("su");
  }

  async addSpeaker(arSpeaker) {
    let speaker = {
      ids: await userModel.genToken(),
      name: arSpeaker.name || "",
      sname: arSpeaker.sname || "",
      email: arSpeaker.email || "",
      phone: arSpeaker.phone || "",
      photo: arSpeaker.photo || "",
      hardSkills: arSpeaker.hardSkills || [],
      softSkills: arSpeaker.softSkills || [],
      token: genToken(),
      pin: genPass("number", 4),
      hidden_tags: [],
      permission: "speaker", // admin, user, speaker
      active: true,
      prefname: "",
      country: arSpeaker.country || "",
      city: arSpeaker.city || "",
      prefix: arSpeaker.prefix || "",

      companyName: arSpeaker.companyName || "",
      companyUrl: arSpeaker.companyUrl || "",
      vacanciesUrl: arSpeaker.vacanciesUrl || "",
      businessSphere: arSpeaker.businessSphere || "",
      questionsForSpeaker: {
        yourProduct: arSpeaker.questionsForSpeaker.yourProduct || "",
        companyTasks: arSpeaker.questionsForSpeaker.companyTasks || "",
        positions: arSpeaker.questionsForSpeaker.positions || "",
        candidatsTasks: arSpeaker.questionsForSpeaker.candidatsTasks || "",
        intership: arSpeaker.questionsForSpeaker.intership || ""
      },
      recording_status: 1
    };

    await userModel.create(speaker);
    this.addToCache(speaker);
    // await this.sendLoginData(user);
    return suJson("su");
  }

  async add(arUser) {
    let user = {
      ids: await userModel.genToken(),
      name: arUser.name || "",
      sname: arUser.sname || "",
      email: arUser.email || "",
      phone: arUser.phone || "",
      photo: arUser.photo || "",
      hardSkills: arUser.hardSkills || [],
      softSkills: arUser.softSkills || [],
      token: genToken(),
      pin: genPass("number", 4),
      hidden_tags: [],
      permission: "user", // admin, user, speaker
      active: true,
      prefname: "",
      country: arUser.country || "",
      city: arUser.city || "",
      prefix: arUser.prefix || "",

      /* поля юзера */
      birthday: arUser.birthday || "",
      university: arUser.university || "",
      speciality: arUser.speciality || "",
      endingYear: arUser.endingYear || "",
      questionsForUser: {
        digital: arUser.questionsForUser.digital || "",
        english: arUser.questionsForUser.english || "",
        anotherLanguage: arUser.questionsForUser.anotherLanguage || "",
        isHackaton: arUser.questionsForUser.isHackaton || "",
        isWorldSkills: arUser.questionsForUser.isWorldSkills || "",
        courses: arUser.questionsForUser.courses || "",
        enoughMoney: arUser.questionsForUser.enoughMoney || "",
        achievements: arUser.questionsForUser.achievements || "",
        isWorking: arUser.questionsForUser.isWorking || ""
      }
    };

    await userModel.create(user);
    this.addToCache(user);
    // await this.sendLoginData(user);
    return suJson("su");
  }

  async sendLoginData(user) {
    if (!user.email) return false;
    this.tmplate = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
			<html xmlns="http://www.w3.org/1999/xhtml">
			<head>
			<meta name="viewport" content="width=device-width" />
			<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
			<title></title>
			</head>
			<body style="margin:0px; background: #f8f8f8; ">
			<div width="100%" style="background: #f8f8f8; padding: 0px 0px; font-family:arial; line-height:28px; height:100%;  width: 100%; color: #514d6a;">
			<div style="max-width: 700px;  margin: 0px auto; font-size: 14px">
				<table border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
				</table>
				<div style="padding: 40px; background: #fff;">
				<table border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
					<tbody>
					<tr>
						<td><b>Dear, ${user.name}</b>
						<p>Your login details:</p>
						<p><b>Login:</b> ${user.ids}</p> 
						<p><b>PIN:</b> ${user.pin}</p>
					</td>
					</tr>
					</tbody>
				</table>
				</div>
			</div>
			</div>
			</body>
			</html>`;
    await Mail.send({ to: user.email, html: this.tmplate });
  }

  async getById(id) {
    if (empty(id)) return false;

    let params;
    if (String(id).length > 6) {
      params = { _id: id };
    } else {
      params = { id };
    }

    let User = await userModel.findOne(params);
    if (empty(User)) return false;

    return this.addToCache(User);
  }

  async passwordRecovery(email) {
    if (empty(email)) return erJson("Не указан email");

    let valem = userModel.validEmail(email);

    if (!isJson(valem)) return valem;

    let User = await userModel.findOne({ email });
    if (empty(User)) return erJson("Пользователь не найден");

    let token = await passRecoveryModel.createToken(User._id);

    if (!isJson(token)) return token;
    else token = ans(token);

    let arPost = {
      to: email,
      html: `<div>Ссылка для восстановления пароля: https://${config.get(
        "host.url"
      )}/recovery/${token}</div>`
    };

    let data = Mail.send(arPost);

    //let data = await postJson(url.noti("/mod/email/send/"),arPost);

    return suJson("Ссылка для восстановления выслана на ваш email");
  }

  async changePassword(token, newpass) {
    let checktok = await passRecoveryModel.checkToken(token);

    if (!isJson(checktok)) return checktok;

    checktok = ans(checktok);

    if (empty(newpass)) return erJson("Не указан пароль");

    let user = await userModel.findOne({ _id: checktok.user_id });

    if (empty(user)) return erJson("Тех ошибка");

    let us = await user.changePass(newpass);

    if (!isJson(us)) return us;

    checktok.active = false;
    checktok.save();

    return suJson("Пароль успешно изменен");
  }

  async getSpeakersShort() {
    let speakers = await userModel.find({ permission: "speaker" });
    speakers = speakers.map(val => {
      // let cntr = tagsManager.country.filter(v => v._id == val.country);
      // const countryName = cntr.length > 0 ? cntr[0].name : "";
      return {
        _id: val._id,
        name: val.name,
        sname: val.sname,
        companyName: val.companyName,
        photo: val.photo,
        businessSphere: val.businessSphere,
        recording_status: val.recording_status,
        permission: val.permission
      };
    });
    return speakers;
  }

  async setHiddenTags({ userId, tagsId }) {
    if (empty(userId) || empty(tagsId))
      return erJson("Auth id and tags id is req");

    let user = await userModel.findOne({ _id: userId });
    if (empty(user)) return erJson("Auth not found");

    let tags = await tagsModel.findOne({ _id: tagsId });
    if (empty(tags)) return erJson("Tags not found");

    if (empty(user.hidden_tags)) user.hidden_tags = [];

    user.hidden_tags.push(tags._id);

    await user.save();

    return suJson("su");
  }

  async getUserList() {
    let users = await userModel.find({ permission: "user" });

    return users.map(val => {
      return val.forClient();
    });
  }
})();
