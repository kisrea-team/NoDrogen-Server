/*
 * @Author: zitons
 * @Date: 2024-02-22 16:04:10
 * @LastEditors: vhko
 * @LastEditTime: 2024-02-29 17:13:46
 * @Description: 页面详细报告
 */

import { NotionAPI } from "notion-client";
import getPageProperties from "../../../../lib/notion/getPageProperties";
import dayjs from "dayjs";
import { idToUuid, getBlockIcon } from "notion-utils";
// import * as notion from '../../../lib/notion'
// import postcss from 'postcss';
import { pagesStaticParam } from "../../../../lib/notion/getData";
import getAllPageIds from "../../../../lib/notion/getAllPageIds";

const mapImgUrl = (img: any, block: any) => {
  let ret = null;

  if (img.startsWith("/")) {
    ret = "https://www.notion.so" + img;
  } else {
    ret = img;
  }

  if (ret.indexOf("amazonaws.com") > 0) {
    ret =
      "https://www.notion.so" +
      "/image/" +
      encodeURIComponent(ret) +
      "?table=" +
      "block" +
      "&id=" +
      block.id;
  }

  return ret;
};

export async function generateStaticParams() {
  return pagesStaticParam();
}

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug; // 'a', 'b', or 'c'
  //获取页面信息
  let data: any;
  const notion = new NotionAPI();
  const recordMap = await notion.getPage(slug);
  const block = recordMap.block;
  const rawMetadata = block[slug].value;

  const collection = Object.values(recordMap.collection)[0]?.["value"];
  const schema = collection?.schema;
  data = await getPageProperties(slug, block, schema);
  // const tags = await getPageProperty(
  //   "tags",
  //   recordMap["block"][slug]["value"],
  //   recordMap
  // )properties

  const tagSchema = Object.values(schema);
  const tagOptions = tagSchema?.[3]?.["options"];
  data["tags"] =
    data?.["tags"]?.map((tag: any) => {
      return {
        name: tag,
        color: tagOptions?.find((t) => t.value === tag)?.color || "gray",
      };
    }) || [];
  data["date"] = data["date"]?.start_date
    ? data["date"]?.start_date
    : dayjs(block[slug].value?.created_time).format("YYYY年MM月DD日").valueOf();

  if (block[slug].value?.format?.page_cover) {
    data["cover"] =
      mapImgUrl(block[slug].value?.format?.page_cover, block[slug].value) ?? "";
  } else {
    data["cover"] =
      "https://www.notion.so/images/page-cover/met_fitz_henry_lane.jpg";
  }

  data["icon"] = getBlockIcon(rawMetadata, recordMap);

  //获取第一个用户
  const id = idToUuid(process.env.PAGE_ID);
  //视图号
  const response = await notion.getPage(id);
  const collectionQuery = response.collection_query;
  const pageIds = getAllPageIds(collectionQuery);
  const users = response?.notion_user;
  const scollection: any = Object.values(response.collection)[0]?.["value"];

  let mainUser;

  const pageCover = mapImgUrl(scollection["cover"], rawMetadata);
  const icon = mapImgUrl(scollection["icon"], rawMetadata);
  for (let i = 0; i < pageIds.length; i++) {
    const id = pageIds[i];
    const properties: any =
      (await getPageProperties(id, block, schema)) || null;
    if (!properties["title"]) {
      continue;
    }
    if (properties["Person"]) {
      mainUser = properties["Person"][0]["name"];
      break;
    }
  }

  const wiki = {
    icon: icon,
    cover: pageCover,
    name: scollection["name"][0][0],
    description: scollection["description"][0][0],
    mainUser: mainUser,
  };

  return Response.json({ wiki, data, recordMap });
}
