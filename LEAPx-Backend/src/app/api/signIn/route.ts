import axios from "axios";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { CmuEntraIDBasicInfo } from "@/types/CmuEntraIDBasicInfo";
import { addCorsHeaders, handleCorsPreFlight } from "@/lib/cors";

type SuccessResponse = {
  ok: true;
};

type ErrorResponse = {
  ok: false;
  message: string;
};

export type SignInResponse = SuccessResponse | ErrorResponse;

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreFlight(req);
}

async function getEmtraIDAccessTokenAsync(
  authorizationCode: string
): Promise<string | null> {
  try {
    const tokenUrl = process.env.CMU_ENTRAID_GET_TOKEN_URL as string;
    const redirectUrl = process.env.CMU_ENTRAID_REDIRECT_URL as string;
    const clientId = process.env.CMU_ENTRAID_CLIENT_ID as string;
    const clientSecret = process.env.CMU_ENTRAID_CLIENT_SECRET as string;
    const scope = process.env.SCOPE as string;

    // console.log("Requesting EntraID token with:", {
    //   redirectUrl,
    //   clientId: clientId.substring(0, 8) + "...",
    //   codeLength: authorizationCode.length
    // });

    const response = await axios.post(
      tokenUrl,
      {
        code: authorizationCode,
        redirect_uri: redirectUrl,
        client_id: clientId,
        client_secret: clientSecret,
        scope: scope,
        grant_type: "authorization_code",
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    // console.log("Got EntraID token");
    return (response.data as { access_token: string }).access_token;
  } catch  {
    console.error(" EntraID token error:");
    return null;
  }
}

async function getCMUBasicInfoAsync(accessToken: string) {
  try {
    const besicinfoUrl = process.env.CMU_ENTRAID_GET_BASIC_INFO as string;
    
    // console.log("Fetching CMU basic info");
    
    const response = await axios.get(besicinfoUrl, {
      headers: { Authorization: "Bearer " + accessToken },
    });
    
    // console.log("Got CMU basic info");
    return response.data as CmuEntraIDBasicInfo;
  } catch  {
    console.error("CMU basic info error:");
    return null;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<SignInResponse>> {
  try {
    const { authorizationCode } = await req.json();

    // console.log("SignIn POST received, code length:", authorizationCode?.length);

    if (!authorizationCode) {
      const response = NextResponse.json<SignInResponse>(
        { ok: false, message: "Invalid authorization code" },
        { status: 400 }
      );
      return addCorsHeaders(response, req) as NextResponse<SignInResponse>;
    }

    if (typeof authorizationCode !== "string") {
      const response = NextResponse.json(
        { ok: false, message: "Invalid authorization code" },
        { status: 400 }
      );
      return addCorsHeaders(response, req) as NextResponse<SignInResponse>;
    }

    const accessToken = await getEmtraIDAccessTokenAsync(authorizationCode);
    if (!accessToken) {
      const response = NextResponse.json<SignInResponse>(
        { ok: false, message: "Cannot get EntraID access token" },
        { status: 400 }
      );
      return addCorsHeaders(response, req) as NextResponse<SignInResponse>;
    }

    const cmuBasicInfo = await getCMUBasicInfoAsync(accessToken);
    if (!cmuBasicInfo) {
      const response = NextResponse.json<SignInResponse>(
        { ok: false, message: "Cannot get cmu basic info" },
        { status: 400 }
      );
      return addCorsHeaders(response, req) as NextResponse<SignInResponse>;
    }

    if (typeof process.env.JWT_SECRET !== "string")
      throw "Please assign jwt secret in .env!";

    const token = jwt.sign(
      {
        cmuitaccount_name: cmuBasicInfo.cmuitaccount_name,
        cmuitaccount: cmuBasicInfo.cmuitaccount,
        student_id: cmuBasicInfo.student_id,
        prename_id: cmuBasicInfo.prename_id,
        prename_TH: cmuBasicInfo.prename_TH,
        prename_EN: cmuBasicInfo.prename_EN,
        firstname_TH: cmuBasicInfo.firstname_TH,
        firstname_EN: cmuBasicInfo.firstname_EN,
        lastname_TH: cmuBasicInfo.lastname_TH,
        lastname_EN: cmuBasicInfo.lastname_EN,
        organization_code: cmuBasicInfo.organization_code,
        organization_name_TH: cmuBasicInfo.organization_name_TH,
        organization_name_EN: cmuBasicInfo.organization_name_EN,
        itaccounttype_id: cmuBasicInfo.itaccounttype_id,
        itaccounttype_TH: cmuBasicInfo.itaccounttype_TH,
        itaccounttype_EN: cmuBasicInfo.itaccounttype_EN,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    const cookieStore = await cookies();
    cookieStore.set({
      name: "cmu-entraid",
      value: token,
      maxAge: 60 * 60 * 24,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      domain: process.env.PUBLIC_DOMAIN,
    });

    // console.log("SignIn successful");
    
    const response = NextResponse.json<SignInResponse>({ ok: true });
    return addCorsHeaders(response, req) as NextResponse<SignInResponse>;
    
  } catch  {
    // console.error("SignIn error:", error);
    const response = NextResponse.json<SignInResponse>(
      { ok: false, message: "Internal server error" },
      { status: 500 }
    );
    return addCorsHeaders(response, req) as NextResponse<SignInResponse>;
  }
}