import subprocess
import os
from pathlib import Path

# 在 Linux 环境下，假设 NCO 已经被安装到 Conda 的 bin 目录中
NCAP2 = "ncap2"
NCECAT = "ncecat"
NCKS = "ncks"
NCPDQ = "ncpdq"
NCRENAME = "ncrename"

# 输入文件路径
FILE_TO_PROCESS = "input.nc"  # 请设置到你的输入文件路径

def remove_temp_nc_files(file_directory):
    """删除目录中所有以temp开头并以.nc结尾的文件"""
    for file in Path(file_directory).glob('temp*.nc'):
        os.remove(file)

def main():
    file_directory = os.path.dirname(FILE_TO_PROCESS)

    # 标量变量列表
    scalar_variable_array = [
        "PWAT_entireatmosphere_consideredasasinglelayer_",
        "PRES_surface",
        "TMP_surface",
        "GUST_surface"
    ]
    scalar_variables = ','.join(scalar_variable_array)

    # 处理标量变量
    subprocess.run([NCKS, '-v', scalar_variables, FILE_TO_PROCESS, os.path.join(file_directory, "tempScalar.nc")], check=True)
    subprocess.run([NCAP2, '-3', '-S', "scale.nco", os.path.join(file_directory, "tempScalar.nc"), os.path.join(file_directory, "scaled.nc")], check=True)

    # 处理风变量
    u_wind = "UGRD_planetaryboundarylayer"
    v_wind = "VGRD_planetaryboundarylayer"
    wind_variable_array = [u_wind, v_wind]
    wind_variable = ','.join(wind_variable_array)

    subprocess.run([NCKS, '-v', wind_variable, FILE_TO_PROCESS, os.path.join(file_directory, "tempWind.nc")], check=True)
    subprocess.run([NCRENAME, '-v', f"{u_wind},U", '-v', f"{v_wind},V", os.path.join(file_directory, "tempWind.nc"), os.path.join(file_directory, "tempUV.nc")], check=True)
    subprocess.run([NCAP2, '-S', "defineLev.nco", os.path.join(file_directory, "tempUV.nc"), os.path.join(file_directory, "tempLevDim.nc")], check=True)
    subprocess.run([NCECAT, '-u', "lev", os.path.join(file_directory, "tempLevDim.nc"), os.path.join(file_directory, "tempRecDim.nc")], check=True)
    subprocess.run([NCKS, '--no_rec_dmn', "lev", os.path.join(file_directory, "tempRecDim.nc"), os.path.join(file_directory, "tempFixDim.nc")], check=True)
    subprocess.run([NCPDQ, '-a', "-lat", os.path.join(file_directory, "tempFixDim.nc"), os.path.join(file_directory, "tempInvDim.nc")], check=True)
    subprocess.run([NCAP2, '-3', '-S', "getMinMax.nco", os.path.join(file_directory, "tempInvDim.nc"), os.path.join(file_directory, "uv.nc")], check=True)

    remove_temp_nc_files(file_directory)

if __name__ == "__main__":
    main()