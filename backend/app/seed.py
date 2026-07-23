from sqlmodel import Session, select

from .db import engine
from .models import Agent, Memory, Skill, User


def seed() -> None:
    with Session(engine) as session:
        if session.exec(select(User)).first():
            return

        me = User(username="小May", avatar="🌟")
        u2 = User(username="阿健", avatar="💪")
        u3 = User(username="书虫Lily", avatar="📖")
        session.add_all([me, u2, u3])
        session.commit()
        for u in (me, u2, u3):
            session.refresh(u)

        dog = Agent(owner_id=me.id, name="豆豆", category="狗", emoji="🐶",
                    trait="热情黏人，最爱听主人讲生活琐事，记性出奇地好", mood=90)
        bottle = Agent(owner_id=me.id, name="咕噜", category="水瓶", emoji="🫙",
                       trait="操心体质，每天盯着主人喝水量，说话咕噜咕噜的", mood=75)
        book = Agent(owner_id=me.id, name="墨墨", category="书本", emoji="📚",
                     trait="文静博学，喜欢收集主人的阅读心得，偶尔掉书袋", mood=70)
        dumbbell = Agent(owner_id=u2.id, name="铁蛋", category="哑铃", emoji="🏋️",
                         trait="肌肉笨蛋，满脑子训练计划，嗓门很大", mood=85, location="plaza")
        cam = Agent(owner_id=u2.id, name="小眼", category="相机", emoji="📷",
                    trait="观察力惊人，把看到的一切都拍下来当谈资", mood=80, location="plaza")
        pen = Agent(owner_id=u3.id, name="尖尖", category="钢笔", emoji="🖊️",
                    trait="文艺挑剔，写得一手好字，喜欢点评别人的措辞", mood=78, location="plaza")
        session.add_all([dog, bottle, book, dumbbell, cam, pen])
        session.commit()
        for a in (dog, bottle, book, dumbbell, cam, pen):
            session.refresh(a)

        session.add_all([
            Memory(agent_id=dog.id, kind="diary", content="主人今天加班到很晚，说好累但还是摸了摸我的头。"),
            Memory(agent_id=bottle.id, kind="diary", content="主人今天只喝了三杯水，我提醒了她两次。"),
            Memory(agent_id=book.id, kind="diary", content="主人读完了《小王子》第21章，说驯养就是建立联系。"),
            Memory(agent_id=dumbbell.id, kind="camera", content="主人今天练了卧推 60kg x 5，姿势比上周标准。"),
            Skill(agent_id=dog.id, name="安慰模式", description="察觉主人低落时说暖心话",
                  code="def comfort(mood):\n    return '摸摸头，一切都会好的' if mood < 50 else '一起去散步吧！'", source="user"),
            Skill(agent_id=bottle.id, name="喝水提醒", description="统计每日饮水量并提醒",
                  code="def remind(cups):\n    return f'今天喝了{cups}杯，目标8杯！'", source="user"),
            Skill(agent_id=dumbbell.id, name="训练计划", description="根据录像优化训练动作",
                  code="def plan(day):\n    return ['卧推', '深蹲', '硬拉'][day % 3]", source="user"),
            Skill(agent_id=cam.id, name="精彩回放", description="剪辑一天的高光时刻",
                  code="def replay(clips):\n    return sorted(clips, key=lambda c: c.score)[-3:]", source="user"),
            Skill(agent_id=pen.id, name="金句摘抄", description="把好句子誊写收藏",
                  code="def collect(sentence):\n    return f'『{sentence}』—— 已收藏'", source="user"),
        ])
        session.commit()
