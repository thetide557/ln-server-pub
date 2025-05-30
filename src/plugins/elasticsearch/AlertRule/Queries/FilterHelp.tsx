import React, { useState } from "react";
import { Drawer,Image } from "antd";
import { useTranslation } from "react-i18next";
import "./style.less";

interface Props {
  visible?: boolean;
  onClose: () => void;
}

export default function FilterHelp({ visible, onClose }: Props) {
  const { t } = useTranslation("alertRules");


  return (
    <>
      <Drawer
        width='60%'
        title={t("common:page_help")}
        visible={visible}
        onClose={onClose}
      >
        <div className="doc-md-content">
          <p>
            {/* <img
              src='/image/es-log-alert.png'
              alt="ES 日志告警"
            /> */}
            <Image
              width="100%"
              src="/image/es-log-alert.png"
              alt="ES 日志告警"
              preview={{
                src: '/image/es-log-alert.png'
              }}
            />
          </p>
          <p>
            ES
            日志告警可以通过对日志进行查询分析，来及时发现异常日志，并触发告警。
          </p>
          <p>
            首先可以选择ES数据源，然后配置查询条件和告警条件，下面针对每个数字指向的功能，进行下详细说明
          </p>
          <h4 id="1-选择索引">1 选择索引</h4>
          <p>支持多种配置方式</p>
          <ol>
            <li>指定单个索引 gb 在 gb 索引中搜索所有的文档</li>
            <li>指定多个索引 gb,us 在 gb 和 us 索引中搜索所有的文档</li>
            <li>
              指定索引前缀 g*,u* 在任何以 g 或者 u 开头的索引中搜索所有的文档
            </li>
          </ol>
          <h4 id="2-设置过滤条件">2 设置过滤条件</h4>
          <p>目前支持的是 query string 语法</p>
          <p>可以指定字段名称进行查询:</p>
          <pre>
            <code>
              - status:active - 查询 status 字段包含 active 的记录 {"\n"}
              - title:(quick OR brown) - 查询 title 字段包含 quick 或 brown 的记录{"\n"}
              - author:&#34;John Smith&#34; - 查询 author 字段包含完整短语 “John Smith” 的记录
            </code>
          </pre>
          <p>支持使用 ? 和 * 通配符:</p>
          <pre >
            <code>- qu?ck - ? 匹配单个字符 {"\n"}
                - bro* - * 匹配零个或多个字符</code>
          </pre>
          <p>使用 ~ 运算符进行模糊匹配:</p>
          <pre >
            <code>
              - quikc~ - 匹配与 quick 相似的词{"\n"}
               - &#34;fox quick&#34;~5 - 短语查询中的词之间可以相隔最多5个位置
            </code>
          </pre>
          <p>支持数值和日期范围:</p>
          <pre >
            <code>
              - count:[1 TO 5] - 闭区间,包含1和5 {"\n"}
              - date:[2022-01-01 TO 2022-12-31] {"\n"}
              - age:&gt;=10 - 大于等于10
            </code>
          </pre>
          <p>可以使用 AND、OR、NOT 等布尔操作符:</p>
          <pre >
            <code>
              - quick AND brown - 同时包含两个词 {"\n"}
              - quick OR brown - 包含其中任意一个词 {"\n"}
              - quick NOT fox - 包含 quick 但不包含 fox
            </code>
          </pre>
          <p>
            详细的语法可以参考{" "}
            <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html">
              ES 文档
            </a>
          </p>
          <h4 id="3-设置日期字段">3 设置日期字段</h4>
          <p>
            点击可以选择日志中的日期字段，通过此字段来作为查询日志的时间范围的依据
          </p>
          <h4 id="4-设置查询日志的时间范围">4 设置查询日志的时间范围</h4>
          <p>如果是 5 分钟，表示在做告警查询时，会查询过去 5 分钟内的日志</p>
          <h4 id="5-数值提取">5 数值提取</h4>
          <p>对日志进行统计分析的函数，比如 count、sum、avg、min、max 等</p>
          <h4 id="6-group-by">6 Group By</h4>
          <p>
            对日志进行分组，比如按照 host 字段进行分组，进行 count 统计,
            查询到的结果会按照 host 字段进行分组
          </p>
          <h4 id="7-告警条件">7 告警条件</h4>
          <p>
            统计分析得到的数值，会赋值给 告警条件中的 A、B、C
            等变量，然后根据这些变量进行告警条件判断，比如 $A &gt; 10
            表示日志数量大于10条时触发告警
          </p>
          <h4 id="8-高级配置">8 高级配置</h4>
          <p>
            在有的场景，日志会出现延迟，如果延迟3 分钟，查询最近 3
            分钟的数据，会查不到数据，这时，可以在高级配置中，设置延迟查询时间，比如延迟
            180s，表示查询查询的时候，把开始时间和终止时间都向前偏移 180s
          </p>
          <h3 id="使用样例">使用样例</h3>
          <h4 id="示例1错误日志监控">示例1：错误日志监控</h4>
          <ul>
            <li>索引：app-logs-*</li>
            <li>查询条件：level:ERROR AND service:payment</li>
            <li>时间范围：5分钟</li>
            <li>数值提取：count()</li>
            <li>
              告警条件：$A &gt; 10
              说明：监控支付服务在5分钟内的错误日志数量是否超过10条
            </li>
          </ul>
          <h4 id="示例2接口响应时间监控">示例2：接口响应时间监控</h4>
          <ul>
            <li>索引：nginx-access-*</li>
            <li>
              查询条件：path:&quot;/api/v1/order*&quot; AND
              response_time:&gt;500
            </li>
            <li>时间范围：10分钟</li>
            <li>数值提取：avg(response_time)</li>
            <li>Group By：path</li>
            <li>
              告警条件：$A &gt; 1000
              说明：监控订单相关接口的平均响应时间是否超过1秒
            </li>
          </ul>
          <h4 id="示例3异常状态码监控">示例3：异常状态码监控</h4>
          <ul>
            <li>索引：nginx-*</li>
            <li>查询条件：status:[500 TO 599]</li>
            <li>时间范围：15分钟</li>
            <li>数值提取：count()</li>
            <li>Group By：host, status</li>
            <li>
              告警条件：$A &gt; 50
              说明：按主机和状态码分组统计5xx错误，如果某台主机的某个状态码出现次数超过50次则告警
            </li>
          </ul>
          <h4 id="示例4业务异常关键字监控">示例4：业务异常关键字监控</h4>
          <ul>
            <li>索引：business-logs-*</li>
            <li>
              查询条件：message:(&ldquo;timeout&rdquo; OR &ldquo;connection
              refused&rdquo; OR &ldquo;out of memory&rdquo;)
            </li>
            <li>时间范围：30分钟</li>
            <li>数值提取：count()</li>
            <li>告警条件：$A &gt; 5 说明：监控包含特定错误关键字的日志数量</li>
          </ul>
        </div>
      </Drawer>
    </>
  );
}
